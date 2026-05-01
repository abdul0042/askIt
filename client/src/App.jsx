import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, MessageSquare, FileText, X, Send,
  AlertCircle, CheckCircle2, Layers, ChevronDown, ChevronUp,
  Trash2, Sparkles, BookOpen, LogOut, Menu, ChevronLeft, Dices, ArrowRight, ArrowLeft, RotateCcw,
  Download, Brain, Plus, Settings2, PlusCircle, Settings, Sun, Moon
} from 'lucide-react'
import logo from './logo.jpeg'
import logoFull from './logo-full.jpeg'
import ReactMarkdown from 'react-markdown'
import { api, getUser, clearAuth } from './auth'

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const PASTEL_COLORS = ['#fef08a', '#fbcfe8', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa'];

const MODELS = [
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'llama3-8b-8192', label: 'Llama 3 8B' },
];

// ─── TypingIndicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="message-row">
      <div className="message-avatar ai">
        <Brain size={18} color="#fff" />
      </div>
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const [showSources, setShowSources] = useState(false)
  const isUser = msg.role === 'user'

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      <div className="message-content">
        <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
          {isUser ? (
            <p>{msg.content}</p>
          ) : (
            <>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.model && (
                <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6, fontStyle: 'italic', fontFamily: 'monospace' }}>
                  Model: {MODELS.find(m => m.id === msg.model)?.label || msg.model}
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 12 }}>
          <span className="message-time">{formatTime(msg.timestamp)}</span>
          {!isUser && msg.sources?.length > 0 && (
            <button className="sources-toggle" onClick={() => setShowSources(v => !v)}>
              <BookOpen size={12} />
              {showSources ? 'Hide' : 'Show'} {msg.sources.length} sources
              {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        {!isUser && showSources && msg.sources?.length > 0 && (
          <div className="sources-list">
            {msg.sources.map((s, i) => (
              <div key={i} className="source-item">
                <span className="source-score">score: {s.score}</span>
                <br />
                {s.text.slice(0, 200)}{s.text.length > 200 ? '…' : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── UploadPanel ──────────────────────────────────────────────────────────────
function UploadPanel({ onChunksChange }) {
  const [tab, setTab] = useState('file')
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') setFile(dropped)
    else setStatus({ type: 'error', msg: 'Please drop a PDF file.' })
  }, [])

  async function handleUpload() {
    setStatus(null)
    setUploading(true)
    try {
      let res
      const uploadData = tab === 'file' ? { name: file.name, type: 'pdf' } : { text: text.trim(), type: 'text' }
      
      if (tab === 'file') {
        if (!file) { setStatus({ type: 'error', msg: 'Please select a PDF file.' }); setUploading(false); return }
        const form = new FormData()
        form.append('file', file)
        res = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        if (!text.trim()) { setStatus({ type: 'error', msg: 'Please paste some text.' }); setUploading(false); return }
        res = await api.post('/upload', { text })
      }
      
      setStatus({ type: 'success', msg: res.data.message })
      setFile(null)
      setText('')
      onChunksChange(uploadData)
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Upload failed. Check your API keys.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="upload-card">
      <div className="section-label">Document Source</div>
      <div className="tab-row">
        <button className={`tab-btn ${tab === 'file' ? 'active' : ''}`} onClick={() => setTab('file')}>
          <Upload size={13} style={{ display: 'inline', marginRight: 5 }} />PDF File
        </button>
        <button className={`tab-btn ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>
          <FileText size={13} style={{ display: 'inline', marginRight: 5 }} />Paste Text
        </button>
      </div>

      <div className="upload-content-area">
        {tab === 'file' ? (
          <>
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                accept=".pdf,application/pdf" 
                onChange={(e) => setFile(e.target.files[0] || null)} 
                id="file-input"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="drop-icon">
                  {file ? <CheckCircle2 size={40} color="#4ade80" /> : <Upload size={40} />}
                </div>
                <div className="drop-label">
                  {file ? 'File ready' : (dragging ? 'Drop PDF here' : 'Click or drag PDF')}
                </div>
                <div className="drop-sublabel">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Max 20 MB · PDF only'}
                </div>
              </label>
            </div>
            {file && (
              <div className="file-preview-card animation-fade-up">
                <div className="file-info">
                  <FileText size={18} className="file-icon" />
                  <div className="file-details">
                    <div className="file-name" title={file.name}>{file.name}</div>
                    <div className="file-meta">PDF Document • Ready to index</div>
                  </div>
                </div>
                <button className="remove-file-btn" onClick={() => setFile(null)}>
                  <X size={14} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-input-wrapper">
            <textarea
              className="text-area"
              placeholder="Paste your document text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {text.trim() && (
              <div className="text-stats animation-fade-up">
                <span>{text.length} chars</span>
                <span>~{Math.ceil(text.length / 400)} chunks</span>
              </div>
            )}
          </div>
        )}
      </div>

      {status && (
        <div className={`alert alert-${status.type} animation-fade-up`} style={{ marginTop: 10 }}>
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <div className="alert-content">
            <div className="alert-message">{status.msg}</div>
          </div>
        </div>
      )}

      <button
        className={`btn-primary upload-submit-btn ${uploading ? 'loading' : ''}`}
        onClick={handleUpload}
        disabled={uploading || (tab === 'file' ? !file : !text.trim())}
        style={{ marginTop: 15, width: '100%', justifyContent: 'center' }}
      >
        {uploading ? (
          <>
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 8 }} />
            <span>Embedding…</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>Embed Document</span>
          </>
        )}
      </button>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate()
  const user = getUser()
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [chunkCount, setChunkCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lastUpload, setLastUpload] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [mode, setMode] = useState('chat')
  const [model, setModel] = useState(() => localStorage.getItem('preferredModel') || 'meta-llama/llama-4-scout-17b-16e-instruct')
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizFinished, setQuizFinished] = useState(false)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [showModeSwitcher, setShowModeSwitcher] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const lastScrollY = useRef(0)
  const fileInputRef = useRef(null)

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : ''
    localStorage.setItem('app-theme', theme)
  }, [theme])

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await api.get('/history')
      if (Array.isArray(res.data)) {
        setHistory(res.data)
      } else {
        setHistory([])
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/status')
      setChunkCount(res.data.chunks)
    } catch { /* ignore */ }
  }, [])

  const handleScroll = useCallback((e) => {
    const currentScrollY = e.target.scrollTop
    if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
      setShowModeSwitcher(false)
    } else {
      setShowModeSwitcher(true)
    }
    lastScrollY.current = currentScrollY
  }, [])

  const onUploadSuccess = (data, meta) => {
    setLastUpload(data)
    setChunkCount(data.chunks)
    
    // Add a visual bubble for the upload
    const uploadMsg = meta.type === 'pdf' 
      ? `📄 **Uploaded PDF:** ${meta.name}`
      : `📝 **Pasted text document** (${meta.length} chars)`
      
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: uploadMsg, 
      timestamp: new Date() 
    }])

    setUploadStatus({ type: 'success', msg: `Successfully indexed ${data.chunks} chunks.` })
    fetchStatus()
    setTimeout(() => setUploadStatus(null), 4000)
  }

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBtn(false)
      setDeferredPrompt(null)
    }
  }

  useEffect(() => {
    localStorage.setItem('preferredModel', model)
  }, [model])

  async function fetchQuiz() {
    setQuizLoading(true)
    setQuizQuestions([])
    setQuizIndex(0)
    setQuizAnswers({})
    setQuizFinished(false)
    try {
      const res = await api.post('/generate-quiz', { model })
      const qs = res.data.map(q => ({
        ...q,
        color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)]
      }))
      setQuizQuestions(qs)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to generate quiz')
    } finally {
      setQuizLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'quiz' && chunkCount > 0 && quizQuestions.length === 0 && !quizLoading && !quizFinished) {
      fetchQuiz()
    }
  }, [mode, chunkCount])

  const handleAnswerSelect = useCallback((idx, option) => {
    setQuizAnswers(prev => {
      if (prev[idx]) return prev;
      return { ...prev, [idx]: option };
    });
  }, []);

  useEffect(() => {
    if (mode !== 'quiz' || quizQuestions.length === 0 || quizFinished) return;
    function handleGlobalKeyDown(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const key = e.key.toUpperCase();
      if (key === 'ARROWLEFT') {
        setQuizIndex(i => Math.max(0, i - 1));
      } else if (key === 'ARROWRIGHT') {
        if (quizAnswers[quizIndex]) {
          if (quizIndex < quizQuestions.length - 1) {
            setQuizIndex(i => i + 1);
          } else {
            setQuizFinished(true);
            triggerConfettiScore();
          }
        }
      } else if (['A','B','C','D'].includes(key)) {
         handleAnswerSelect(quizIndex, key);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [mode, quizQuestions, quizFinished, quizIndex, quizAnswers, handleAnswerSelect]);

  function triggerConfettiScore() {
    let score = 0;
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) score++;
    });
    if (score >= 7) {
       // just a fake confetti placeholder, we can style it via CSS
       const confettiDiv = document.createElement('div');
       confettiDiv.className = 'confetti-burst';
       document.body.appendChild(confettiDiv);
       setTimeout(() => document.body.removeChild(confettiDiv), 3000);
    }
  }

  function handleNextQuiz() {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(i => i + 1)
    } else {
      setQuizFinished(true)
      triggerConfettiScore()
    }
  }

  function handleTouchStart(e) {
    touchStartX.current = e.changedTouches[0].screenX
  }

  function handleTouchEnd(e) {
    touchEndX.current = e.changedTouches[0].screenX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) { // threshold
      if (diff > 0) {
        // swipe left -> next
        if (quizAnswers[quizIndex]) {
          handleNextQuiz()
        }
      } else {
        // swipe right -> prev
        setQuizIndex(i => Math.max(0, i - 1))
      }
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/signin')
  }



  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/upload', formData)
      onUploadSuccess(res.data, { type: 'pdf', name: file.name })
      setLastUpload({ type: 'pdf', name: file.name })
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadStatus({ type: 'error', msg: err.response?.data?.error || 'Upload failed. Please try again.' })
      setTimeout(() => setUploadStatus(null), 5000)
    } finally {
      setLoading(false)
      if (e.target) e.target.value = '' // Clear input so same file can be re-uploaded
    }
  }

  const handleTextUpload = async () => {
    if (!pastedText.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/upload', { text: pastedText })
      onUploadSuccess(res.data, { type: 'text', length: pastedText.length })
      setLastUpload({ type: 'text', text: pastedText })
      setTextModalOpen(false)
      setPastedText('')
    } catch (err) {
      console.error('Text upload failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    try {
      await api.delete('/clear')
      setChunkCount(0)
      setMessages([])
    } catch (err) { console.error(err) }
  }

  async function handleSend() {
    const q = question.trim()
    if (!q || loading) return
    const userMsg = { role: 'user', content: q, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setLoading(true)
    // close sidebar on mobile after sending
    setSidebarOpen(false)
    try {
      const res = await api.post('/chat', { question: q, model })
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer, sources: res.data.sources, model, timestamp: new Date() }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `⚠️ **Error:** ${err.response?.data?.error || 'Something went wrong. Please check the server and API keys.'}`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      fetchHistory() // Refresh history after new message
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const sampleQuestions = [
    'Summarize the main topics',
    'What are the key findings?',
    'List the conclusions',
    'Explain the methodology',
  ]

  if (initialLoading) {
    return (
      <div className="splash-screen">
        <img src={logoFull} alt="askIt" className="splash-logo" />
        <div className="splash-loader">
          <div className="splash-progress" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile sidebar toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="header-brand">
            <div className="brand-icon">
              <img src={logo} alt="askIt Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <span className="brand-name">askIt</span>
            <span className="brand-badge">RAG · Llama 4 Scout</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-status">
            <div className={`status-dot ${chunkCount > 0 ? '' : 'inactive'}`} />
            <span className="status-text">
              {chunkCount > 0 ? `${chunkCount} chunks indexed` : 'No docs'}
            </span>
          </div>

          {showInstallBtn && (
            <button className="install-pill" onClick={handleInstallClick} title="Install app">
              <Download size={14} />
              <span>Install App</span>
            </button>
          )}

          <div className="user-pill">
            <div className="user-avatar">{user?.firstName?.[0]?.toUpperCase() || '?'}</div>
            <span className="user-name">{user?.firstName}</span>
          </div>

          <button id="logout-btn" className="logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
            <span className="logout-text">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Mobile Sidebar Overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-close-row">
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft size={16} /> Close
          </button>
        </div>
        <div className="sidebar-inner-v2">
          <div className="sidebar-top">
            <button className="new-chat-btn" onClick={() => { setMessages([]); setLastUpload(null); setChunkCount(0); }}>
              <PlusCircle size={18} />
              <span>New Chat</span>
            </button>

            <div className="history-section">
              <div className="sidebar-label">Recent Chats</div>
              <div className="history-list">
                {historyLoading ? (
                  <div className="history-loading-state">
                    <div className="spinner-v2" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)' }} />
                    <p>Loading history...</p>
                  </div>
                ) : history.length > 0 ? (
                  history.map(item => (
                    <button 
                      key={item.id} 
                      className="history-item animation-fade-up" 
                      onClick={() => {
                        setMessages([
                          { role: 'user', content: item.question, timestamp: new Date(item.timestamp) },
                          { role: 'ai', content: item.answer, timestamp: new Date(item.timestamp) }
                        ])
                        setSidebarOpen(false)
                      }}
                    >
                      <MessageSquare size={14} />
                      <div className="history-info">
                        <span className="history-title">{item.question}</span>
                        <span className="history-time">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="history-empty-state">
                    <MessageSquare size={32} />
                    <p>No recent chats</p>
                    <span>Your conversations will appear here.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar-bottom">
            <button className="sidebar-bottom-btn" onClick={() => setSettingsOpen(true)}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button className="sidebar-bottom-btn logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Chat Panel ─────────────────────────────────────────── */}
      <main className="chat-panel">
        <div className={`mode-switcher-bar ${showModeSwitcher ? 'visible' : 'hidden'}`}>
          <div className="mode-tabs">
            <button className={`mode-tab ${mode === 'chat' ? 'active' : ''}`} onClick={() => setMode('chat')}>
              <MessageSquare size={14} /> Chat Mode
            </button>
            <button className={`mode-tab ${mode === 'quiz' ? 'active' : ''}`} onClick={() => setMode('quiz')}>
              <Dices size={14} /> Quiz Mode
            </button>
          </div>
        </div>

        <div className="messages-area" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto' }}>
          {mode === 'chat' ? (
            messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-orb">
                <MessageSquare size={36} color="#fff" />
              </div>
              <h1 className="welcome-title">
                Hey {user?.firstName || 'there'} 👋
              </h1>
              {uploadStatus && (
                <div className={`upload-status-alert ${uploadStatus.type} animation-fade-up`}>
                  {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{uploadStatus.msg}</span>
                </div>
              )}
              <p className="welcome-subtitle">
                Upload a PDF or paste text in the sidebar, then ask any question about your document. Powered by <strong>Groq Llama 4 Scout</strong> and <strong>Cohere Embeddings</strong>.
              </p>
              {chunkCount > 0 && (
                <div className="welcome-chips">
                  {sampleQuestions.map((q) => (
                    <button
                      key={q}
                      className="welcome-chip"
                      onClick={() => { setQuestion(q); textareaRef.current?.focus() }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {chunkCount === 0 && (
                <button className="open-sidebar-hint" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} /> Upload a document to get started
                </button>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
              {loading && <TypingIndicator />}
            </>
          )
          ) : (
            <div className="quiz-container">
              {chunkCount === 0 ? (
                <div className="empty-sticky-state" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={40} className="empty-sticky-icon" />
                  <p>Upload a document to generate a quiz</p>
                </div>
              ) : quizLoading ? (
                <div className="empty-sticky-state">
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, marginBottom: 16 }} />
                  <p>Generating 10 questions for you...</p>
                </div>
              ) : quizFinished ? (
                <div className="score-card">
                  <h2 className="score-title">Quiz Complete! 🎉</h2>
                  <div className="score-number">
                    {Object.keys(quizAnswers).reduce((acc, idx) => acc + (quizAnswers[idx] === quizQuestions[idx].correct ? 1 : 0), 0)} / {quizQuestions.length}
                  </div>
                  <p className="score-subtitle">
                    {Math.round((Object.keys(quizAnswers).reduce((acc, idx) => acc + (quizAnswers[idx] === quizQuestions[idx].correct ? 1 : 0), 0) / quizQuestions.length) * 100)}% Correct
                  </p>
                  
                  <div className="score-actions">
                    <button className="btn-secondary" onClick={fetchQuiz}>
                      <RotateCcw size={16} /> Retake Quiz
                    </button>
                    <button className="btn-primary" onClick={() => setMode('chat')}>
                      <MessageSquare size={16} /> Back to Chat
                    </button>
                  </div>
                  
                  <div className="review-list">
                    <h3 style={{ marginTop: 40, marginBottom: 16, color: '#fff' }}>Review Answers</h3>
                    {quizQuestions.map((q, i) => {
                      const userAns = quizAnswers[i];
                      const isCorrect = userAns === q.correct;
                      return (
                        <div key={i} className={`review-item ${isCorrect ? 'correct' : 'wrong'}`}>
                          <div className="review-q">{i+1}. {q.question}</div>
                          <div className="review-ans">Your answer: {q.options[userAns]} {isCorrect ? '✅' : '❌'}</div>
                          {!isCorrect && <div className="review-correct">Correct answer: {q.options[q.correct]}</div>}
                          <div className="review-exp">{q.explanation}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : quizQuestions.length > 0 ? (
                <div 
                  className="quiz-view"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="quiz-progress-bar">
                    <div className="quiz-progress-fill" style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} />
                  </div>
                  
                  <div className="quiz-card-wrapper">
                    {(() => {
                      const q = quizQuestions[quizIndex];
                      const selected = quizAnswers[quizIndex];
                      return (
                        <div className="quiz-card" style={{ backgroundColor: q.color }}>
                          <h3 className="quiz-question-text">{q.question}</h3>
                          
                          <div className="quiz-options">
                            {['A','B','C','D'].map(opt => {
                              let optClass = 'quiz-option-btn';
                              if (selected) {
                                if (opt === q.correct) optClass += ' correct';
                                else if (opt === selected) optClass += ' wrong';
                                else optClass += ' disabled';
                              }
                              return (
                                <button key={opt} className={optClass} onClick={() => handleAnswerSelect(quizIndex, opt)} disabled={!!selected}>
                                  <span className="opt-label">{opt}</span> {q.options[opt]}
                                </button>
                              )
                            })}
                          </div>
                          
                          {selected && (
                            <div className="quiz-explanation animation-fade-up">
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  
                  <div className="quiz-nav-row">
                    <button className="quiz-nav-btn" onClick={() => setQuizIndex(i => Math.max(0, i-1))} disabled={quizIndex === 0}>
                      <ArrowLeft size={16} /> Previous
                    </button>
                    <span className="quiz-counter">{quizIndex + 1} / {quizQuestions.length}</span>
                    <button className={`quiz-nav-btn ${quizAnswers[quizIndex] ? 'ready' : ''}`} onClick={handleNextQuiz} disabled={!quizAnswers[quizIndex]}>
                      {quizIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ── */}
        <div className="chat-input-container">
          <div className="chat-input-card">
            <textarea
              ref={textareaRef}
              className="chat-textarea-v2"
              rows={1}
              placeholder={chunkCount > 0 ? 'Ask anything about your document…' : 'Upload a document first, then ask questions…'}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || chunkCount === 0}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
              }}
            />
            
            <div className="chat-input-actions">
              <div className="chat-input-actions-left">
                <div className="attach-wrapper">
                  <button 
                    className={`action-icon-btn ${attachMenuOpen ? 'active' : ''}`}
                    onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                    title="Add attachment"
                  >
                    <Plus size={22} />
                  </button>
                  
                  {attachMenuOpen && (
                    <>
                      <div className="attach-menu-overlay" onClick={() => setAttachMenuOpen(false)} />
                      <div className="attach-menu animation-fade-up">
                        <button className="attach-menu-item" onClick={() => { fileInputRef.current?.click(); setAttachMenuOpen(false); }}>
                          <FileText size={14} />
                          <span>Upload PDF</span>
                        </button>
                        <button className="attach-menu-item" onClick={() => { setTextModalOpen(true); setAttachMenuOpen(false); }}>
                          <MessageSquare size={14} />
                          <span>Paste Text</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="application/pdf"
                onChange={handleFileUpload}
              />

              {/* Text Upload Modal */}
              {textModalOpen && (
                <div className="modal-overlay">
                  <div className="modal-content animation-fade-up">
                    <div className="modal-header">
                      <h3>Paste Document Text</h3>
                      <button className="modal-close" onClick={() => setTextModalOpen(false)}><X size={18} /></button>
                    </div>
                    <textarea 
                      className="modal-textarea" 
                      placeholder="Paste your text here..." 
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                    <div className="modal-footer">
                      <button className="btn-secondary" onClick={() => setTextModalOpen(false)}>Cancel</button>
                      <button className="btn-primary" onClick={handleTextUpload} disabled={loading || !pastedText.trim()}>
                        {loading ? 'Uploading...' : 'Upload Text'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Modal */}
              {settingsOpen && (
                <div className="modal-overlay">
                  <div className="modal-content animation-fade-up" style={{ maxWidth: 400 }}>
                    <div className="modal-header">
                      <h3>Settings</h3>
                      <button className="modal-close" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
                    </div>
                    
                    <div className="settings-section">
                      <div className="sidebar-label">Appearance</div>
                      <div className="theme-toggle-group">
                        <button 
                          className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                          onClick={() => setTheme('light')}
                        >
                          <Sun size={16} />
                          <span>Light</span>
                        </button>
                        <button 
                          className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                          onClick={() => setTheme('dark')}
                        >
                          <Moon size={16} />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>

                    <div className="settings-section" style={{ marginTop: 24 }}>
                      <div className="sidebar-label">System</div>
                      <button className="btn-secondary" onClick={handleClear} style={{ width: '100%', justifyContent: 'center' }}>
                        <Trash2 size={14} /> Clear All Document Data
                      </button>
                    </div>

                    <div className="modal-footer" style={{ marginTop: 12 }}>
                      <button className="btn-primary" onClick={() => setSettingsOpen(false)} style={{ width: '100%' }}>Done</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="chat-input-actions-right">
                <div className="model-wrapper">
                  <button 
                    className={`action-icon-btn ${modelMenuOpen ? 'active' : ''}`}
                    onClick={() => setModelMenuOpen(!modelMenuOpen)}
                    title="Change model"
                  >
                    <Settings2 size={18} />
                  </button>
                  
                  {modelMenuOpen && (
                    <>
                      <div className="attach-menu-overlay" onClick={() => setModelMenuOpen(false)} />
                      <div className="attach-menu right animation-fade-up">
                        <div className="attach-menu-label">AI Model</div>
                        {MODELS.map(m => (
                          <button 
                            key={m.id} 
                            className={`attach-menu-item ${model === m.id ? 'active' : ''}`}
                            onClick={() => { setModel(m.id); setModelMenuOpen(false); }}
                          >
                            <Sparkles size={14} />
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  id="send-btn"
                  className={`send-btn-v2 ${loading || !question.trim() || chunkCount === 0 ? 'disabled' : ''}`}
                  onClick={handleSend}
                  disabled={loading || !question.trim() || chunkCount === 0}
                >
                  {loading ? <div className="spinner-v2" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
