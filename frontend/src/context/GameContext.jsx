import { createContext, useContext, useState, useCallback } from 'react'

const GameCtx = createContext(null)

export function GameProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('syn5ergy_user') || 'null') } catch { return null }
  })
  const [scenario, setScenario] = useState(null)
  const [role, setRole] = useState(null)

  const login = useCallback((token, userData) => {
    localStorage.setItem('syn5ergy_token', token)
    localStorage.setItem('syn5ergy_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('syn5ergy_token')
    localStorage.removeItem('syn5ergy_user')
    setUser(null)
  }, [])

  return (
    <GameCtx.Provider value={{ user, login, logout, scenario, setScenario, role, setRole }}>
      {children}
    </GameCtx.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
