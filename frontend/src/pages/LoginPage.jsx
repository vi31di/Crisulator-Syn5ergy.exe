import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../data/api.js'
import { useGame } from '../context/GameContext.jsx'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useGame()
  const navigate = useNavigate()

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      let resp
      if (mode === 'login') {
        resp = await api.login({ username: form.username, password: form.password })
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return }
        resp = await api.register({ username: form.username, password: form.password, name: form.name })
      }
      login(resp.token, resp.user)
      navigate('/roles')
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const guestMode = () => {
    navigate('/roles')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="font-mono text-[10px] tracking-widest text-slate-500 mb-2">INCIDENTOS / AUTH</div>
            <h1 className="font-display text-3xl text-gradient animate-shimmer">
              {mode === 'login' ? 'War Room Access' : 'Create Account'}
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {mode === 'login' ? 'Sign in to track your performance and leaderboard ranking.' : 'Create your profile to save scores and compete.'}
            </p>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Display Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/40"
                />
              </div>
            )}
            <div>
              <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Username</label>
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="username"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/40"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="••••••••"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neon-cyan/40"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-red-400 font-mono text-xs text-center">{error}</div>
          )}

          <button
            onClick={submit}
            disabled={loading || !form.username || !form.password}
            className="mt-6 w-full py-3 rounded-xl bg-neon-cyan text-ink-900 font-bold tracking-widest text-sm hover:bg-white transition-all shadow-glowCyan disabled:opacity-40"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'ENTER WAR ROOM' : 'CREATE ACCOUNT'}
          </button>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-[10px] text-slate-600">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            onClick={guestMode}
            className="mt-4 w-full py-3 rounded-xl border border-white/10 text-slate-400 font-mono text-sm hover:bg-white/5 transition-all"
          >
            Continue as Guest
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="font-mono text-[11px] text-slate-500 hover:text-neon-cyan transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
