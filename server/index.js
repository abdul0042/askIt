require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { CohereClient } = require('cohere-ai');
const Groq = require('groq-sdk');
const { db, collection, getDocs, doc, setDoc, writeBatch, query, where } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://askit.vercel.app',
    'https://askit-git-main-mabdulsalam034-2083s-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function chunkText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  while (start < cleaned.length) {
    const end = start + chunkSize;
    chunks.push(cleaned.slice(start, end));
    if (end >= cleaned.length) break;
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

async function embedTexts(texts) {
  const response = await cohere.embed({
    texts,
    model: 'embed-english-v3.0',
    inputType: 'search_document',
  });
  return response.embeddings;
}

async function embedQuery(query) {
  const response = await cohere.embed({
    texts: [query],
    model: 'embed-english-v3.0',
    inputType: 'search_query',
  });
  return response.embeddings[0];
}

app.post('/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const usersSnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase())));
    if (!usersSnapshot.empty)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const firstName = fullName.trim().split(' ')[0];
    const newUser = {
      id: Date.now().toString(),
      fullName: fullName.trim(),
      firstName,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", newUser.id), newUser);
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, firstName: newUser.firstName, fullName: newUser.fullName },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: newUser.id, fullName: newUser.fullName, firstName: newUser.firstName, email: newUser.email },
    });
  } catch (err) {
    console.error('[/auth/signup]', err.message);
    res.status(500).json({ error: 'Sign up failed. Please try again.' });
  }
});

app.post('/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const usersSnapshot = await getDocs(query(collection(db, "users"), where("email", "==", email.toLowerCase().trim())));
    if (usersSnapshot.empty)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const user = usersSnapshot.docs[0].data();
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, firstName: user.firstName, fullName: user.fullName },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, fullName: user.fullName, firstName: user.firstName, email: user.email },
    });
  } catch (err) {
    console.error('[/auth/signin]', err.message);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    let rawText = '';
    if (req.file) {
      const data = await pdfParse(req.file.buffer);
      rawText = data.text;
    } else if (req.body.text) {
      rawText = req.body.text;
    } else {
      return res.status(400).json({ error: 'No file or text provided.' });
    }

    if (!rawText.trim())
      return res.status(400).json({ error: 'Could not extract text from input.' });

    const chunks = chunkText(rawText);
    if (chunks.length === 0)
      return res.status(400).json({ error: 'Text too short to process.' });

    const BATCH = 96;
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const embeddings = await embedTexts(chunks.slice(i, i + BATCH));
      allEmbeddings.push(...embeddings);
    }

    const entries = chunks.map((text, i) => ({ text, embedding: allEmbeddings[i], userId: req.user.id }));
    const batch = writeBatch(db);
    const vectorsRef = collection(db, "vectors");
    for (const entry of entries) batch.set(doc(vectorsRef), entry);
    await batch.commit();

    res.json({ message: `Successfully processed ${chunks.length} chunks.`, chunks: chunks.length });
  } catch (err) {
    console.error('[/upload]', err.message);
    res.status(500).json({ error: err.message || 'Upload failed.' });
  }
});

app.post('/chat', requireAuth, async (req, res) => {
  try {
    const { question, model = 'meta-llama/llama-4-scout-17b-16e-instruct' } = req.body;
    const { firstName } = req.user;

    if (!question?.trim())
      return res.status(400).json({ error: 'Question is required.' });

    const vectorsSnapshot = await getDocs(query(collection(db, "vectors"), where("userId", "==", req.user.id)));
    const store = vectorsSnapshot.docs.map(d => d.data());
    if (store.length === 0)
      return res.status(400).json({ error: 'No documents indexed yet. Please upload a document first.' });

    const queryEmbedding = await embedQuery(question);
    const scored = store.map(entry => ({
      text: entry.text,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    })).sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 3);
    const context = topChunks.map((c, i) => `[Chunk ${i + 1}]:\n${c.text}`).join('\n\n---\n\n');

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: `You are an expert AI research assistant. The user's name is ${firstName}. Always address them by name. Answer using ONLY the provided document context. If not found, say "I couldn't find this information in the uploaded document."` },
        { role: 'user', content: `Context:\n\n${context}\n\n---\n\nQuestion: ${question}` },
      ],
      temperature: 0.35,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || 'No response generated.';
    res.json({ answer, sources: topChunks.map(c => ({ text: c.text, score: Math.round(c.score * 100) / 100 })) });
  } catch (err) {
    console.error('[/chat]', err.message);
    res.status(500).json({ error: err.message || 'Chat failed.' });
  }
});

app.post('/generate-quiz', requireAuth, async (req, res) => {
  try {
    const { model = 'meta-llama/llama-4-scout-17b-16e-instruct' } = req.body;
    const vectorsSnapshot = await getDocs(query(collection(db, "vectors"), where("userId", "==", req.user.id)));
    const store = vectorsSnapshot.docs.map(d => d.data());
    if (store.length === 0)
      return res.status(400).json({ error: 'No documents indexed yet. Please upload a document first.' });

    const contextText = store.slice(0, 20).map(c => c.text).join('\n\n');
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: `Generate 10 multiple choice questions from this document. Return ONLY a JSON array, no markdown.\nFormat: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"..."}]\n\nDocument:\n${contextText}` }],
      temperature: 0.4,
      max_tokens: 2048,
    });

    let answer = completion.choices[0]?.message?.content || '[]';
    const start = answer.indexOf('[');
    const end = answer.lastIndexOf(']');
    if (start !== -1 && end !== -1) answer = answer.substring(start, end + 1);

    res.json(JSON.parse(answer));
  } catch (err) {
    console.error('[/generate-quiz]', err.message);
    res.status(500).json({ error: err.message || 'Quiz generation failed.' });
  }
});

app.delete('/clear', requireAuth, async (req, res) => {
  try {
    const vectorsSnapshot = await getDocs(query(collection(db, "vectors"), where("userId", "==", req.user.id)));
    const batch = writeBatch(db);
    vectorsSnapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ message: 'Vector store cleared.' });
  } catch (err) {
    console.error('[/clear]', err.message);
    res.status(500).json({ error: 'Failed to clear vectors.' });
  }
});

app.get('/status', requireAuth, async (req, res) => {
  try {
    const vectorsSnapshot = await getDocs(query(collection(db, "vectors"), where("userId", "==", req.user.id)));
    res.json({ chunks: vectorsSnapshot.size });
  } catch (err) {
    res.json({ chunks: 0 });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 RAG Server running on http://localhost:${PORT}`);
});
