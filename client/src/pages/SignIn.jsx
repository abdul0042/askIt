import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react'
import logo from '../logo.png'
import { setAuth, api } from '../auth'

export default function SignIn() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/signin', form)
      setAuth(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Sign in failed. Please try again.')
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

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue your research</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="signin-email"
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
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="signin-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="auth-input"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
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

          <button id="signin-submit" type="submit" className="auth-submit-btn" disabled={loading}>
            {loading
              ? <><div className="spinner" />Signing in…</>
              : <><Sparkles size={16} />Sign In</>}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  )
}
