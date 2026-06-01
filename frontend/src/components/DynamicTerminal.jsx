import { useState, useRef, useEffect } from 'react'
import { api } from '../data/api.js'
import { COMMANDS } from '../data/scenarios.js'

const BUILT_IN = {
  help: (role) => {
    const cmds = COMMANDS[role] || COMMANDS.oncall
    return [
      '╔══════════════════════════════════════════╗',
      '║         AVAILABLE COMMANDS               ║',
      '╚══════════════════════════════════════════╝',
      ...Object.entries(cmds).map(([cmd, meta]) =>
        ` ${cmd.padEnd(28)} ${meta.desc}`
      ),
      '',
      ' Type a command and press ENTER to execute.',
    ]
  },
  status: (state) => [
    `STATUS    : ${state.status}`,
    `SEVERITY  : ${state.severity}`,
    `SCORE     : ${state.score} / 100`,
    `TIME LEFT : ${state.timeLeft}`,
  ]
}

export function DynamicTerminal({ role, scenarioId, onCommand, currentState, uiModifiers = {} }) {
  const [output, setOutput] = useState([
    { type: 'sys', text: '╔══════════════════════════════════════════╗' },
    { type: 'sys', text: '║       CRISULATOR INCIDENT TERMINAL       ║' },
    { type: 'sys', text: '╚══════════════════════════════════════════╝' },
    { type: 'sys', text: 'Authentication accepted. You have root access.' },
    { type: 'sys', text: 'Type "help" to view all available commands.' },
    { type: 'sys', text: '' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [isEval, setIsEval] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  const print = (lines, type = 'sys') => {
    const arr = Array.isArray(lines) ? lines : [lines]
    setOutput(p => [...p, ...arr.map(t => ({ type, text: t }))])
  }

  const getTabSuggestions = (val) => {
    if (uiModifiers.disable_autocomplete) {
        return ['[ERROR] COGNITIVE OVERLOAD - AUTOCOMPLETE OFFLINE'];
    }
    const cmds = Object.keys(COMMANDS[role] || COMMANDS.oncall)
    return cmds.filter(c => c.startsWith(val.toLowerCase())).slice(0, 5)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      runCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[history.length - 1 - idx] || '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? '' : history[history.length - 1 - idx] || '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const sugg = getTabSuggestions(input)
      if (sugg.length === 1) {
        setInput(sugg[0])
        setSuggestions([])
      } else {
        setSuggestions(sugg)
      }
    } else {
      setSuggestions([])
    }
  }

  const runCommand = async (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    setInput('')
    setHistIdx(-1)
    setHistory(h => [...h, trimmed])
    print(`$ ${trimmed}`, 'cmd')

    const lc = trimmed.toLowerCase()

    // Built-in client-side commands
    if (lc === 'help') {
      print(BUILT_IN.help(role))
      onCommand?.({ command: trimmed, outcome: 'neutral', points: 0, feedback: 'Checked help.', stateChanges: {} })
      return
    }
    if (lc === 'status') {
      print(BUILT_IN.status(currentState))
      onCommand?.({ command: trimmed, outcome: 'neutral', points: 0, feedback: 'Checked status.', stateChanges: {} })
      return
    }
    if (lc === 'clear') {
      setOutput([])
      return
    }

    // AI-evaluated commands
    setIsEval(true)
    print('Executing...', 'dim')

    try {
      const result = await api.evaluateCommand({
        command: trimmed,
        scenario_id: scenarioId,
        role,
        current_state: currentState,
      })

      // Remove the "Executing..." line
      setOutput(p => p.filter(l => l.text !== 'Executing...'))
      print(result.terminal_output, result.outcome === 'bad' ? 'error' : result.outcome === 'good' ? 'good' : 'sys')

      onCommand?.({
        command: trimmed,
        outcome: result.outcome,
        points: result.points,
        feedback: result.feedback,
        stateChanges: result.state_changes || {}
      })
    } catch {
      setOutput(p => p.filter(l => l.text !== 'Executing...'))
      // Client-side fallback evaluation
      const fallback = evaluateFallback(lc, role)
      print(fallback.output, fallback.outcome === 'bad' ? 'error' : 'sys')
      onCommand?.({
        command: trimmed,
        outcome: fallback.outcome,
        points: fallback.points,
        feedback: fallback.feedback,
        stateChanges: fallback.stateChanges || {}
      })
    } finally {
      setIsEval(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-black/90 border border-white/10 rounded-xl overflow-hidden font-mono text-xs">
      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5 scrollbar-cyber min-h-0">
        <div className="text-slate-500 mb-2 border-b border-white/10 pb-1 text-[10px] tracking-widest">
          TERMINAL // root@incident-vm ~ %
        </div>
        {output.map((line, i) => (
          <div key={i} className={`leading-relaxed whitespace-pre-wrap ${
            line.type === 'cmd' ? 'text-neon-cyan'
            : line.type === 'error' ? 'text-red-400'
            : line.type === 'good' ? 'text-green-400'
            : line.type === 'dim' ? 'text-slate-600 italic'
            : 'text-green-300/90'
          }`}>
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {uiModifiers.stack_warnings && (
          <div className="px-4 py-1 bg-red-900/40 border-t border-red-500/50 animate-pulse text-red-400 text-[10px] uppercase font-bold tracking-widest text-center">
              [CRITICAL SYSTEM STRESS - MANUAL OVERRIDE REQUIRED]
          </div>
      )}

      {/* Tab suggestions */}
      {suggestions.length > 1 && (
        <div className="px-4 py-1 flex gap-3 border-t border-white/5">
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus() }}
              className="text-neon-purple text-[10px] hover:text-neon-cyan">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 flex items-center px-4 py-2 gap-2">
        <span className="text-neon-cyan shrink-0">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isEval}
          placeholder="type command (Tab to autocomplete)"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-700 focus:outline-none caret-neon-cyan"
          autoFocus
        />
        {isEval && <span className="text-neon-cyan/60 animate-pulse text-[10px]">RUNNING</span>}
      </div>
    </div>
  )
}

// ─── Fallback evaluation when backend is offline ────────────────────────────
function evaluateFallback(cmd, role) {
  const good = (output, points, feedback, stateChanges = {}) => ({ outcome: 'good', output, points, feedback, stateChanges })
  const bad = (output, points, feedback) => ({ outcome: 'bad', output, points, feedback })
  const neutral = (output) => ({ outcome: 'neutral', output, points: 0, feedback: 'Neutral action.' })

  if (cmd === 'ack') return good('Page acknowledged. You are now Incident Commander.', 10, 'Good — you took ownership quickly.')
  if (cmd === 'throttle ingress' || cmd === 'throttle api') return good('SUCCESS: Rate limits applied. Retry storm slowing.', 20, 'Excellent — throttling the ingress cut the retry storm.')
  if (cmd === 'restart db' || cmd === 'restart redis') return good(`SUCCESS: ${cmd.split(' ')[1]} restarted. Connection pool reset.`, 15, `Smart move. Restarting ${cmd.split(' ')[1]} cleared the deadlocks.`)
  if (cmd.startsWith('rollback')) return good('Rollback initiated. Reverting to stable build...', 10, 'Rolling back reverted the bad deploy that caused latency.')
  if (cmd === 'block ips') return good('WAF updated. 8,231 IPs blocked. Auth attempts dropping.', 20, 'Correct first step — blocking the attacking IPs.')
  if (cmd === 'enable mfa') return good('MFA enforced. All new sessions require 2FA.', 15, 'Good defensive move to protect accounts.')
  if (cmd === 'isolate hosts' || cmd.startsWith('isolate')) return good('Host isolated. Network access revoked.', 15, 'Isolating compromised hosts prevents lateral movement.')
  if (cmd === 'scale payments-api') return bad('WARNING: Scaling worsened DB deadlocks — more connections!', -15, 'Critical error: scaling during a deadlock sends MORE connections to the DB.')
  if (cmd === 'resolve') return neutral('Attempted resolve — check if system is stable first.')
  return bad(`Command '${cmd}' not recognized. Type 'help'.`, -2, 'Invalid command wastes precious seconds during an incident.')
}
