import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../data/api.js'

const COLORS = {
  manager: { border: 'border-neon-cyan/60', bg: 'bg-neon-cyan/10', label: 'text-neon-cyan', badge: 'MANAGER' },
  teammate: { border: 'border-neon-purple/60', bg: 'bg-neon-purple/10', label: 'text-neon-purple', badge: 'TEAMMATE' },
  client: { border: 'border-blue-400/60', bg: 'bg-blue-400/10', label: 'text-blue-400', badge: 'CLIENT' },
  lead: { border: 'border-pink-400/60', bg: 'bg-pink-400/10', label: 'text-pink-400', badge: 'TECH LEAD' },
}

const FALLBACK_MESSAGES = {
  manager: [
    'What is the ETA for resolution?',
    'Update the status page NOW.',
    'Board is asking. I need numbers.',
    'You have 5 minutes before I escalate.',
  ],
  teammate: [
    'Did you check the runbook for this pattern?',
    'I can handle the rollback if you do throttling.',
    'Logs show db deadlock — restart might help.',
  ],
  client: [
    'Our business is losing $10k/min. Please.',
    'Can we send an update to customers?',
    'When will checkout work again?',
  ],
  lead: [
    'You should have ack-ed 3 minutes ago.',
    'Have you read the architecture diagram?',
    'Stop guessing. Look at the traces.',
  ],
}

function getRandomPos() {
  return {
    top: `${Math.floor(Math.random() * 50) + 10}%`,
    right: `${Math.floor(Math.random() * 20) + 2}%`,
  }
}

export function PressureAgents({ scenarioId, situation, isStarted, timeLeft, maxTimeMs, onDismiss }) {
  const [popups, setPopups] = useState([])
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio('/alert.mp3')
    audioRef.current.volume = 0.15
  }, [])

  const addPopup = useCallback((agentId, message) => {
    const colors = COLORS[agentId]
    setPopups(p => [...p.slice(-4), { // max 5 popups at once
      id: `${Date.now()}_${Math.random()}`,
      agentId,
      message,
      pos: getRandomPos(),
      ...colors,
    }])
    audioRef.current?.play().catch(() => {})
    onDismiss?.()
  }, [onDismiss])

  const triggerBroadcast = useCallback(async () => {
    const elapsed = maxTimeMs - timeLeft
    // Escalate frequency as time runs out
    const agents = ['manager', 'teammate', 'client', 'lead']
    const agentId = agents[Math.floor(Math.random() * agents.length)]

    try {
      const resp = await api.agentBroadcast({
        logs: [],
        scenario_id: scenarioId,
      })
      const data = resp[agentId]
      if (data?.message) addPopup(agentId, data.message)
    } catch {
      const msgs = FALLBACK_MESSAGES[agentId]
      addPopup(agentId, msgs[Math.floor(Math.random() * msgs.length)])
    }
  }, [scenarioId, timeLeft, maxTimeMs, addPopup])

  useEffect(() => {
    if (!isStarted) return

    const getInterval = () => {
      if (timeLeft < 30000) return 7000   // Last 30s: every 7s
      if (timeLeft < 60000) return 12000  // Last 60s: every 12s
      if (timeLeft < 120000) return 20000 // Last 2min: every 20s
      return 35000                         // Otherwise: every 35s
    }

    const run = () => {
      triggerBroadcast()
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(run, getInterval())
    }

    intervalRef.current = setInterval(run, getInterval())
    return () => clearInterval(intervalRef.current)
  }, [isStarted, timeLeft, triggerBroadcast])

  const dismiss = (id) => setPopups(p => p.filter(x => x.id !== id))

  if (!isStarted || !popups.length) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Critical warning banner in final 30s */}
      {timeLeft < 30000 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full font-bold font-mono text-sm animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]">
          ⚠ CRITICAL — SYSTEM COLLAPSE IMMINENT
        </div>
      )}

      {popups.map(p => (
        <div
          key={p.id}
          className={`absolute pointer-events-auto border ${p.border} ${p.bg} rounded-xl p-4 w-64 shadow-[0_0_20px_rgba(0,0,0,0.6)] animate-bounce`}
          style={{ top: p.top, right: p.right }}
        >
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
            <span className={`font-bold font-mono text-[10px] tracking-widest ${p.label}`}>{p.badge}</span>
            <button onClick={() => dismiss(p.id)}
              className="text-slate-500 hover:text-white font-bold px-1 transition-colors cursor-pointer">✕</button>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{p.message}</p>
        </div>
      ))}
    </div>
  )
}
