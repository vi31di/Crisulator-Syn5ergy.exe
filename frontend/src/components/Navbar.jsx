import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext.jsx'

export function Navbar() {
  const { user, logout } = useGame()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isCommand = location.pathname === '/command'

  return (
    <header className={`sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-glass ${isCommand ? 'py-2' : 'py-3'}`}>
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse shadow-glowCyan" />
          <span className="font-display text-sm tracking-widest text-slate-100">CRISULATOR</span>
          <span className="font-mono text-[9px] text-slate-500 hidden sm:block">INCIDENT SIMULATOR</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link to="/roles" className="font-mono text-[11px] text-slate-400 hover:text-neon-cyan transition-colors hidden sm:block">
            ROLES
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-neon-cyan hidden sm:block">
                {user.name || user.username}
              </span>
              <button onClick={handleLogout}
                className="font-mono text-[11px] text-slate-500 hover:text-red-400 transition-colors">
                LOGOUT
              </button>
            </div>
          ) : (
            <Link to="/login"
              className="px-3 py-1.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan font-mono text-[11px] hover:bg-neon-cyan/20 transition-all">
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
