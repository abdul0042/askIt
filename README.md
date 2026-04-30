# askIt - AI-Powered RAG Assistant

**askIt** is a premium, full-stack RAG (Retrieval-Augmented Generation) application that allows users to upload documents (PDFs or text) and interact with them through an intelligent chat interface or an automatically generated quiz.

![askIt Logo](./client/src/image.png)

## 🚀 Features

- **Document Indexing**: Upload PDFs or paste raw text. The app chunks and embeds your content using **Cohere** for high-accuracy retrieval.
- **Intelligent Chat**: Ask complex questions about your documents and get answers powered by **Llama 3.3 70B** or **Llama 4 Scout** (via Groq).
- **AI Quiz Mode**: Automatically generate interactive quizzes based on your document's content with detailed explanations.
- **PWA Ready**: Installable on Desktop and Mobile as a standalone application.
- **Real-time Context**: Visual "Active Context" indicators show exactly what document is being used for your answers.
- **Secure Authentication**: Built-in user accounts with Firestore persistence.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Lucide Icons, React Markdown.
- **Backend**: Node.js, Express.
- **Database**: Firebase Firestore (for user data and vector metadata).
- **AI/LLM**: Groq (Llama 4 Scout, Llama 3.3 70B).
- **Embeddings**: Cohere API.
- **Auth**: JWT with bcrypt encryption.

## 📂 Project Structure

```text
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # Sign In, Sign Up, Dashboard
│   │   ├── auth.js         # Auth helpers
│   │   ├── App.jsx         # Main Logic & UI
│   │   └── index.css       # Core Design System (Glassmorphism)
│   ├── public/             # PWA Manifest & Icons
│   └── vite.config.js      # PWA & Proxy Configuration
├── server/                 # Node.js Backend
│   ├── index.js            # Express API & RAG Logic
│   ├── firebase.js         # Firestore Configuration
│   └── package.json
└── .env                    # API Keys & Secrets
```

## ⚙️ Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with the following:
```env
GROQ_API_KEY=your_key
COHERE_API_KEY=your_key
PORT=5000
JWT_SECRET=your_secret_key
```

### 2. Backend Setup
```bash
cd server
npm install
npm start
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

## 📱 PWA Installation
Once running, you can install askIt as a native app:
- **Chrome**: Click the "Install" icon in the address bar.
- **Mobile**: Use "Add to Home Screen" in your browser menu.

---
Built with ❤️ by Abdul
