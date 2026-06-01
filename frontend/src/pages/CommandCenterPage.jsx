import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SeverityBadge } from '../components/SeverityBadge.jsx'
import { LogsPanel } from '../components/LogsPanel.jsx'
import { AIChatChannel } from '../components/AIChatChannel.jsx'
import { DynamicTerminal } from '../components/DynamicTerminal.jsx'
import { Timeline } from '../components/Timeline.jsx'
import { MetricsPanel } from '../components/MetricsPanel.jsx'
import { AlertSummarizer } from '../components/AlertSummarizer.jsx'
import { PressureAgents } from '../components/PressureAgents.jsx'
import { DUMMY_SCENARIO } from '../data/scenarios.js'
import { api } from '../data/api.js'
import { useGame } from '../context/GameContext.jsx'

function msToClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(t % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const TAB_LABELS = ['LOGS', 'METRICS', 'TIMELINE']

export function CommandCenterPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useGame()

  const role = state?.role ?? 'oncall'
  const scenarioId = state?.scenarioId ?? 'retry_storm'
  const [scenario, setScenario] = useState(state?.scenario || DUMMY_SCENARIO)

  const MAX_TIME_MS = 5 * 60 * 1000
  const [isStarted, setIsStarted] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const timeLeft = isStarted ? Math.max(0, MAX_TIME_MS - (now - startedAt)) : MAX_TIME_MS

  const [actionLog, setActionLog] = useState([])
  const [timeline, setTimeline] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  
  // Projection State (Controlled by Orchestrator)
  const [gameState, setGameState] = useState({ status: 'Investigating', severity: scenario.severity || 'SEV0', score: 50, tempo: 'normal' })
  
  // Emergent Simulation State
  const [metrics, setMetrics] = useState({
    error_rate: { value: 0, confidence: 1.0, freshness: 'live' },
    p95_latency: { value: 0, confidence: 1.0, freshness: 'live' },
    db_connections: { value: 0, confidence: 1.0, freshness: 'live' },
    cpu: { value: 0, confidence: 1.0, freshness: 'live' }
  })
  const [spontaneousEvents, setSpontaneousEvents] = useState([])
  const [uiModifiers, setUiModifiers] = useState({
    disable_autocomplete: false,
    disappear_notifications: false,
    stack_warnings: false
  })
  
  const lastTickIdRef = useRef(-1)

  // Load scenario from backend if available
  useEffect(() => {
    api.getScenario(role, scenarioId)
      .then(s => { setScenario(s); setSeverity(s.severity) })
      .catch(() => {}) 
  }, [role, scenarioId])

  useEffect(() => {
    if (!isStarted) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [isStarted])
  
  // The Central Simulation Tick Poller
  useEffect(() => {
      if (!isStarted) return;
      
      const tick = async () => {
          try {
              const data = await api.getMetrics(scenarioId); // Which calls /simulation/tick
              if (data) {
                  // Out-of-order tick rejection (Preemption safe)
                  if (data.tick_id !== undefined) {
                      if (data.tick_id < lastTickIdRef.current) {
                          console.warn(`[TICK REJECTED] Received stale tick ${data.tick_id}. Current is ${lastTickIdRef.current}`);
                          return;
                      }
                      lastTickIdRef.current = data.tick_id;
                  }
                  
                  if (data.metrics) setMetrics(data.metrics);
                  if (data.ui_fatigue_modifiers) setUiModifiers(data.ui_fatigue_modifiers);
                  if (data.simulation_state) {
                      setGameState(prev => ({
                          ...prev,
                          ...data.simulation_state
                      }));
                  }
                  
                  if (data.spontaneous_events && data.spontaneous_events.length > 0) {
                      setSpontaneousEvents(prev => [...prev, ...data.spontaneous_events]);
                  }
                  
                  if (data.ending) {
                      navigate('/debrief', {
                          state: { score: gameState.score, role, actionLog, scenarioId, scenario, timeTaken: MAX_TIME_MS - timeLeft, branch: data.ending }
                      })
                  }
              }
          } catch(err) {
              console.error("Tick failed", err);
          }
      };
      
      const id = setInterval(tick, 5000);
      return () => clearInterval(id);
  }, [isStarted, scenarioId, navigate, role, actionLog, scenario, timeLeft, gameState.score]);

  // Auto-fail on timeout
  useEffect(() => {
    if (isStarted && timeLeft === 0 && gameState.status !== 'Resolved') {
      navigate('/debrief', {
        state: { score: Math.max(0, gameState.score - 20), role, actionLog, scenarioId, scenario, timeTaken: MAX_TIME_MS }
      })
    }
  }, [timeLeft, isStarted, gameState.status, navigate, gameState.score, role, actionLog, scenarioId, scenario])

  const startGame = () => {
    setStartedAt(Date.now())
    setNow(Date.now())
    setIsStarted(true)
    setTimeline([{ t: 'T+00:00', label: 'SYSTEM: War Room Initialized', kind: 'system' }])
  }

  const roleLabel = { oncall: 'On-Call SWE', security: 'Cybersecurity', comms: 'PR / Comms' }[role] || role

  const handleCommand = useCallback(({ command, outcome, points, feedback, stateChanges }) => {
    const elapsed = msToClock(MAX_TIME_MS - timeLeft)
    setTimeline(p => [...p, {
      t: `T+${elapsed}`,
      label: `> ${command}`,
      kind: outcome === 'good' ? 'action' : outcome === 'bad' ? 'error' : 'action'
    }])
    setActionLog(p => [...p, { command, type: outcome, feedback, points: points >= 0 ? `+${points}` : `${points}` }])
    
    // Status/severity/score is completely decoupled and owned by Orchestrator tick now.
    
  }, [timeLeft, actionLog, navigate, role, scenarioId, scenario])

  return (
    <div className="pb-16 pt-6 relative min-h-screen">
      {/* ── Pre-game briefing overlay ── */}
      {!isStarted && (
        <div className="absolute inset-0 z-[99999] flex items-center justify-center bg-ink-950/90 backdrop-blur-md px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full p-8 rounded-2xl border border-red-500/50 bg-ink-900 shadow-[0_0_50px_rgba(255,0,0,0.2)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 rounded border border-red-500 bg-red-500/10 text-red-400 font-mono text-xs font-bold">
                {scenario.severity}
              </span>
              <span className="font-mono text-slate-400 text-sm">{scenario.service}</span>
            </div>
            <h1 className="font-display text-3xl text-red-400 mb-1">{scenario.title}</h1>
            <div className="space-y-4 text-sm text-slate-300 my-6 font-mono border-l-2 border-red-500/30 pl-4">
              <p><span className="text-neon-cyan">SITUATION:</span> {scenario.description}</p>
              <p><span className="text-neon-cyan">ROLE:</span> {roleLabel}</p>
              <p><span className="text-neon-cyan">TIME LIMIT:</span> <span className="text-red-400 font-bold">5 minutes</span> to resolve before system collapse.</p>
              <p><span className="text-neon-cyan">OBJECTIVE:</span> Use the terminal, logs, and AI chat to diagnose and fix the incident. Type <code className="text-neon-cyan bg-white/5 px-1 rounded">help</code> to see commands.</p>
            </div>

            {/* Recent logs preview */}
            <div className="bg-black/60 rounded-xl p-4 font-mono text-xs space-y-1 mb-6 max-h-32 overflow-y-auto">
              {scenario.logs?.slice(0, 5).map((l, i) => (
                <div key={i} className="text-green-400/80">{l}</div>
              ))}
            </div>

            <button onClick={startGame}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)]">
              ⚡ START WAR ROOM
            </button>
          </motion.div>
        </div>
      )}

      <div className={!isStarted ? 'filter blur-sm opacity-30 pointer-events-none' : ''}>
        {/* ── Status bar ── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-glass">
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={gameState.severity} />
            <span className="font-display text-base tracking-wide text-slate-100">{scenario.service || 'Unknown Service'}</span>
            <span className="rounded-full border border-white/10 bg-ink-900/50 px-3 py-1 font-mono text-[10px] text-slate-300">{roleLabel}</span>
            <span className="rounded-full border border-white/10 bg-ink-900/50 px-3 py-1 font-mono text-[10px] text-slate-300">{gameState.status}</span>
            {gameState.tempo && gameState.tempo !== 'normal' && (
              <span className="rounded-full border border-purple-500/50 bg-purple-500/10 px-3 py-1 font-mono text-[10px] text-purple-400 animate-pulse">
                TEMPO: {gameState.tempo.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
              timeLeft < 30000 ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
              : timeLeft < 60000 ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
              : 'border-white/10 bg-ink-900/50 text-slate-300'
            }`}>
              ⏱ {msToClock(timeLeft)}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/50 px-3 py-1 font-mono text-[10px] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/80 animate-pulse" />
              SCORE: {gameState.score}/100
            </div>
          </div>
        </div>

        {/* ── Main 3-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left column: Logs + secondary tabs */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Tab switcher for left panel */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {TAB_LABELS.map((t, i) => (
                <button key={t} onClick={() => setActiveTab(i)}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all ${
                    activeTab === i ? 'bg-white/10 text-neon-cyan' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="h-[400px]">
              {activeTab === 0 && (
                <div className="h-full flex flex-col gap-3">
                  <LogsPanel initialLines={scenario.logs || []} isMasked={uiModifiers.mask_logs} />
                  <AlertSummarizer logs={scenario.logs || []} scenarioId={scenarioId} />
                </div>
              )}
              {activeTab === 1 && (
                <MetricsPanel 
                  scenarioId={scenarioId} 
                  baseMetrics={scenario.metrics} 
                  externalMetrics={metrics}
                  isMasked={uiModifiers.mask_dashboard}
                  tempo={gameState.tempo}
                  timeline={timeline}
                  score={gameState.score}
                  incidentPhase={gameState.status}
                  actionLog={actionLog}
                />
              )}
              {activeTab === 2 && (
                <div className="h-full overflow-y-auto">
                  <Timeline items={timeline} />
                </div>
              )}
            </div>
          </div>

          {/* Right column: Chat + Terminal */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Chat (30% height) */}
            <div className="h-[220px]">
              <AIChatChannel
                scenarioId={scenarioId}
                situation={`${scenario.title}: ${scenario.description}`}
                isActive={isStarted}
                spontaneousEvents={spontaneousEvents}
              />
            </div>

            {/* Terminal (remaining height) */}
            <div className="h-[340px]">
              <DynamicTerminal
                role={role}
                scenarioId={scenarioId}
                onCommand={handleCommand}
                currentState={gameState}
                uiModifiers={uiModifiers}
              />
            </div>
          </div>
        </div>

        {/* ── Bottom row: Timeline + Score (visible on desktop) ── */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 hidden lg:grid">
          <div className="lg:col-span-8">
            <Timeline items={timeline} />
          </div>
          <div className="lg:col-span-4">
            <div className="glass glow-border-cyan rounded-2xl p-4">
              <div className="font-mono text-[10px] text-slate-500 tracking-widest mb-2">PERFORMANCE</div>
              <div className="flex items-end gap-2 mb-3">
                <span className="font-display text-4xl text-slate-50">{gameState.score}</span>
                <span className="font-mono text-xs text-slate-500 mb-1">/ 100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-500"
                  style={{ width: `${gameState.score}%` }} />
              </div>
              <div className="mt-3 text-[10px] font-mono text-slate-500">
                {actionLog.length} actions taken
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating pressure agent popups */}
      <PressureAgents
        scenarioId={scenarioId}
        situation={scenario.description}
        isStarted={isStarted}
        timeLeft={timeLeft}
        maxTimeMs={MAX_TIME_MS}
      />
    </div>
  )
}
