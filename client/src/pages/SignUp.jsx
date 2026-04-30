import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react'
import logo from '../logo.png'
import { setAuth } from '../auth'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/auth/signup', form)
      setAuth(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <img src={logo} alt="askIt Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <span className="auth-brand-name">askIt</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start chatting with your documents in seconds</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Full Name</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                id="signup-name"
                name="fullName"
                type="text"
                placeholder="Jane Smith"
                className="auth-input"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="auth-input"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Password <span className="auth-hint-text">(min 6 chars)</span></label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="signup-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="auth-input"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button id="signup-submit" type="submit" className="auth-submit-btn" disabled={loading}>
            {loading
              ? <><div className="spinner" />Creating account…</>
              : <><Sparkles size={16} />Create Account</>}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/signin" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
