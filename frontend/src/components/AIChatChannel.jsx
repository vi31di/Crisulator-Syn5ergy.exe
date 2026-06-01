import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../data/api.js'

const PARTICIPANTS = {
  cto: {
    id: 'cto',
    name: 'CTO',
    emoji: '💼',
    badge: 'Executive',
    accent: 'purple',
    colorClass: 'border-purple-500/40 bg-purple-950/20 text-purple-400 hover:border-purple-400',
    bubbleBorder: 'border-purple-500/20',
    desc: 'Chief Technology Officer',
    responsibility: 'Overall technology direction, business impact assessment, and executive board communications.',
    focus: 'Downstream business impact, SLA breaches, and stakeholder alignment.',
    status: 'Escalated'
  },
  manager: {
    id: 'manager',
    name: 'Incident Manager',
    emoji: '📋',
    badge: 'Operations',
    accent: 'blue',
    colorClass: 'border-blue-500/40 bg-blue-950/20 text-blue-400 hover:border-blue-400',
    bubbleBorder: 'border-blue-500/20',
    desc: 'Crisis Response Coordinator',
    responsibility: 'Facilitates timelines, manages operational milestones, and keeps focus on containment.',
    focus: 'Incident timeline, playbooks, and communications routing.',
    status: 'Responding'
  },
  lead: {
    id: 'lead',
    name: 'SRE Lead',
    emoji: '⚓',
    badge: 'Site Reliability',
    accent: 'cyan',
    colorClass: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400 hover:border-cyan-400',
    bubbleBorder: 'border-cyan-500/20',
    desc: 'Site Reliability Engineering Lead',
    responsibility: 'Ensures site reliability, manages load limits, and coordinates primary mitigations.',
    focus: 'System metrics, high error rates, socket limits, and failover health.',
    status: 'Investigating'
  },
  backend: {
    id: 'backend',
    name: 'Backend Engineer',
    emoji: '☕',
    badge: 'Core Engineering',
    accent: 'cyan',
    colorClass: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400 hover:border-cyan-400',
    bubbleBorder: 'border-cyan-500/20',
    desc: 'Senior Distributed Systems Developer',
    responsibility: 'Maintains core application code, routing logs, and API gateway logic.',
    focus: 'Downstream API latencies, code faults, and thread pools.',
    status: 'Investigating'
  },
  analyst: {
    id: 'analyst',
    name: 'Security Analyst',
    emoji: '🕵️',
    badge: 'Cybersecurity',
    accent: 'red',
    colorClass: 'border-rose-500/40 bg-rose-950/20 text-rose-450 hover:border-rose-400',
    bubbleBorder: 'border-rose-500/20',
    desc: 'SecOps Incident Responder',
    responsibility: 'Analyzes access patterns, containment rules, and verifies potential intrusion signatures.',
    focus: 'Unauthorized access tokens, anomalous headers, and boundary logs.',
    status: 'Monitoring'
  },
  soc: {
    id: 'soc',
    name: 'SOC Lead',
    emoji: '🛡️',
    badge: 'Security Operations',
    accent: 'red',
    colorClass: 'border-rose-500/40 bg-rose-950/20 text-rose-450 hover:border-rose-400',
    bubbleBorder: 'border-rose-500/20',
    desc: 'Security Operations Center Lead',
    responsibility: 'Manages incident visibility across the SOC dashboard and coordinates defense playbooks.',
    focus: 'Intrusion detection, firewall rules, and security briefings.',
    status: 'Monitoring'
  },
  dba: {
    id: 'dba',
    name: 'Database Admin',
    emoji: '🗄️',
    badge: 'Data Platform',
    accent: 'orange',
    colorClass: 'border-amber-500/40 bg-amber-950/20 text-amber-400 hover:border-amber-400',
    bubbleBorder: 'border-amber-500/20',
    desc: 'Lead DBA Coordinator',
    responsibility: 'Monitors pool connections, replication lags, query optimization, and cluster sizing.',
    focus: 'Postgres connection pool saturation, locks, and database deadlocks.',
    status: 'Monitoring'
  },
  devops: {
    id: 'devops',
    name: 'DevOps Engineer',
    emoji: '🚀',
    badge: 'Platform Ops',
    accent: 'cyan',
    colorClass: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400 hover:border-cyan-400',
    bubbleBorder: 'border-cyan-500/20',
    desc: 'Infrastructure Automator',
    responsibility: 'Deploys containerized clusters, scaling thresholds, and routing layers.',
    focus: 'Kubernetes pod configurations, container restarts, and memory allocations.',
    status: 'Monitoring'
  },
  pm: {
    id: 'pm',
    name: 'Product Manager',
    emoji: '📐',
    badge: 'Product Delivery',
    accent: 'purple',
    colorClass: 'border-purple-500/40 bg-purple-950/20 text-purple-400 hover:border-purple-400',
    bubbleBorder: 'border-purple-500/20',
    desc: 'Technical Product Manager',
    responsibility: 'Tracks feature health and aligns with marketing/sales on feature availability.',
    focus: 'Customer satisfaction, checkout workflows, and user engagement.',
    status: 'Monitoring'
  },
  comms: {
    id: 'comms',
    name: 'Communications Lead',
    emoji: '📣',
    badge: 'Public Relations',
    accent: 'green',
    colorClass: 'border-green-500/40 bg-green-950/20 text-green-400 hover:border-green-400',
    bubbleBorder: 'border-green-500/20',
    desc: 'Corporate Communications Director',
    responsibility: 'Formulates statements, customer bulletins, and manages social sentiment spikes.',
    focus: 'Brand integrity, PR outages, and social sentiment indexing.',
    status: 'Responding'
  },
  stakeholder: {
    id: 'stakeholder',
    name: 'Executive Stakeholder',
    emoji: '👑',
    badge: 'Board',
    accent: 'purple',
    colorClass: 'border-purple-500/40 bg-purple-950/20 text-purple-400 hover:border-purple-400',
    bubbleBorder: 'border-purple-500/20',
    desc: 'VP of Business Operations',
    responsibility: 'Maintains high-level board visibility and reviews business damage mitigation.',
    focus: 'Client escalations, enterprise contracts, and legal exposures.',
    status: 'Escalated'
  },
  support: {
    id: 'support',
    name: 'Customer Support Lead',
    emoji: '🎧',
    badge: 'Support Ops',
    accent: 'green',
    colorClass: 'border-green-500/40 bg-green-950/20 text-green-400 hover:border-green-400',
    bubbleBorder: 'border-green-500/20',
    desc: 'Support Operations Lead',
    responsibility: 'Maintains customer support ticket queues and feeds ticket surges to the incident room.',
    focus: 'Support ticket surges, customer feedback trends, and ETAs.',
    status: 'Monitoring'
  },
  assistant: {
    id: 'assistant',
    name: 'AI Assistant',
    emoji: '🤖',
    badge: 'AI Agent',
    accent: 'neutral',
    colorClass: 'border-slate-500/40 bg-slate-900/40 text-slate-400 hover:border-slate-400',
    bubbleBorder: 'border-slate-800/30',
    desc: 'Predictive Telemetry AI Agent',
    responsibility: 'Assists incident commanders with automated logs audits and metric predictions.',
    focus: 'Real-time anomaly identification and socratic remediation advice.',
    status: 'Monitoring'
  }
}

const TYPING_MESSAGES = {
  cto: 'CTO is reviewing telemetry...',
  manager: 'Incident Manager is coordinating response...',
  lead: 'SRE Lead is reviewing playbooks...',
  backend: 'Backend Engineer is auditing downstream API latency...',
  analyst: 'Security Analyst is investigating network anomalies...',
  soc: 'SOC Lead is scanning network edge boundaries...',
  dba: 'Database Administrator is checking pg pool saturation...',
  devops: 'DevOps Engineer is assessing pod memory allocation...',
  pm: 'Product Manager is reviewing customer checkout error rates...',
  comms: 'Communications Lead is preparing executive briefing statement...',
  stakeholder: 'Executive Stakeholder is assessing operational liability exposure...',
  support: 'Customer Support Lead is monitoring ticket queue surge...',
  assistant: 'AI Assistant is generating telemetry predictive modeling...'
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

function SenderBadge({ senderId }) {
  const isUser = senderId === 'You'
  
  if (isUser) {
    return (
      <div className="shrink-0 mt-0.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 font-mono text-[9px] whitespace-nowrap select-none">
        👤 Operator (You)
      </div>
    )
  }
  
  const p = PARTICIPANTS[senderId.toLowerCase()] || PARTICIPANTS.manager
  
  return (
    <div className="relative group shrink-0 mt-0.5">
      <div className={`rounded-full border px-2 py-0.5 font-mono text-[9px] whitespace-nowrap cursor-help transition-all duration-200 ${p.colorClass}`}>
        {p.emoji} {p.name}
      </div>
      
      {/* Immersive Tooltip Card */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:flex flex-col w-64 p-3 bg-[#0d131a] border border-slate-800 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.8)] z-50 pointer-events-none text-[11px] font-sans normal-case text-slate-300">
        <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-slate-800">
          <div className="font-mono font-bold text-slate-100 flex items-center gap-1.5">
            <span className="text-sm">{p.emoji}</span>
            <span>{p.name}</span>
          </div>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
            p.status === 'Escalated' ? 'bg-red-950/40 text-red-400 border-red-900/30'
            : p.status === 'Responding' ? 'bg-blue-950/40 text-blue-400 border-blue-900/30'
            : p.status === 'Investigating' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/30 animate-pulse'
            : 'bg-green-950/40 text-green-400 border-green-900/30'
          }`}>
            {p.status}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="text-purple-400 font-mono text-[9px] uppercase tracking-wider font-bold">
            Team: {p.badge}
          </div>
          <div className="italic text-slate-350 leading-relaxed font-sans">{p.desc}</div>
          <div className="text-[10px] leading-relaxed"><strong className="text-slate-200">Responsibility:</strong> {p.responsibility}</div>
          <div className="text-[10px] leading-relaxed"><strong className="text-slate-200">Active Focus:</strong> <span className="text-cyan-300">{p.focus}</span></div>
        </div>
      </div>
    </div>
  )
}

export function AIChatChannel({ scenarioId, situation, isActive, initialMessages = [], spontaneousEvents = [] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [targetAgent, setTargetAgent] = useState('manager')
  const [isTyping, setIsTyping] = useState(false)
  const [history, setHistory] = useState([])
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
  }, [messages, isTyping])

  // Seed initial messages
  useEffect(() => {
    if (initialMessages.length) return
    const seeds = [
      { from: 'manager', text: 'Incident timeline initiated. We are trending towards SEV0. Give me a clear status update and confirm remediation steps.', isUser: false },
    ]
    let t = 0
    seeds.forEach(s => {
      setTimeout(() => setMessages(p => [...p, s]), (t += 1500))
    })
  }, [])

  // Handle spontaneous events from Orchestrator
  useEffect(() => {
    if (!spontaneousEvents || spontaneousEvents.length === 0) return
    
    const newMessages = spontaneousEvents
        .filter(event => event.type === 'chat')
        .map(event => {
            // Deduce a participant sender ID from event sender name
            const senderLower = event.sender.toLowerCase();
            let fromId = 'manager';
            if (senderLower.includes('cto')) fromId = 'cto';
            else if (senderLower.includes('analyst') || senderLower.includes('security')) fromId = 'analyst';
            else if (senderLower.includes('lead') || senderLower.includes('sre')) fromId = 'lead';
            else if (senderLower.includes('dba') || senderLower.includes('database')) fromId = 'dba';
            else if (senderLower.includes('comms') || senderLower.includes('comm')) fromId = 'comms';
            else if (senderLower.includes('assistant')) fromId = 'assistant';
            else if (senderLower.includes('backend') || senderLower.includes('engineer')) fromId = 'backend';
            else if (senderLower.includes('devops')) fromId = 'devops';
            else if (senderLower.includes('pm') || senderLower.includes('product')) fromId = 'pm';
            else if (senderLower.includes('soc')) fromId = 'soc';
            else if (senderLower.includes('stakeholder')) fromId = 'stakeholder';
            else if (senderLower.includes('support')) fromId = 'support';
            
            return {
                from: fromId,
                text: event.message,
                isUser: false
            }
        })
        
    if (newMessages.length > 0) {
        setMessages(p => {
            const exists = p.some(m => m.text === newMessages[newMessages.length - 1].text)
            if (exists) return p
            return [...p, ...newMessages]
        })
    }
  }, [spontaneousEvents])

  const send = async () => {
    if (!input.trim() || isTyping) return
    let currentTarget = targetAgent
    const msgLower = input.toLowerCase()
    
    // Support mentions tagging for all 13 participants
    Object.keys(PARTICIPANTS).forEach(key => {
      if (msgLower.includes(`@${key}`)) {
        currentTarget = key
      }
    })

    setTargetAgent(currentTarget)

    const userMsg = { from: 'You', text: input, isUser: true, target: currentTarget }
    setMessages(p => [...p, userMsg])
    const msgContent = input
    setInput('')
    setIsTyping(true)

    const newHistory = [...history, { role: 'user', content: msgContent }]
    setHistory(newHistory)

    try {
      // Use the actual participant name from PARTICIPANTS map
      const apiAgentName = PARTICIPANTS[currentTarget]?.name || 'Incident Manager';
      
      const resp = await api.agentChat({
        agent: apiAgentName,
        situation,
        scenario_id: scenarioId,
        user_message: msgContent,
        history: newHistory.slice(-6)
      })
      
      const agentMsg = { from: currentTarget, text: resp.message, isUser: false }
      setMessages(p => [...p, agentMsg])
      setHistory(h => [...h, { role: 'assistant', content: resp.message }])
    } catch {
      const fallbacks = {
        cto: 'Escalate this immediately. Keep me updated on downstream business impacts.',
        manager: 'Stop explaining. Confirm remediation steps and give me an ETA.',
        lead: 'Check the architecture diagram. Make sure we check downstream database socket thresholds.',
        backend: 'Let me double-check the connection pools and latency. Give me two minutes.',
        analyst: 'Analyzing endpoint ingress patterns. Threat signature looks anomalous.',
        soc: 'Monitoring perimeter firewall containment. Standing by to drop traffic logs.',
        dba: 'DB thread pool is reaching limit boundaries. Standing by to optimize.',
        devops: 'Kubernetes pods show standard configuration. Pod restarts are stable.',
        pm: 'Customer support reports a 45% ticket queue spike. Need SLA updates ASAP.',
        comms: 'Preparing an executive stakeholder statement. Managing brand outage indices.',
        stakeholder: 'Reviewing enterprise SLA breach indices. Keep downstream latency clear.',
        support: 'Surging client chats reported. Feeds have been redirected here.',
        assistant: 'Real-time telemetry indicators suggest pg-pool queue saturation. Monitor connections.'
      }
      
      setMessages(p => [...p, {
        from: currentTarget,
        text: fallbacks[currentTarget] || 'Acknowledged. Standing by.',
        isUser: false
      }])
    } finally {
      setIsTyping(false)
    }
  }

  // Active responders for Header Status Bar
  const activeRespondersList = ['manager', 'cto', 'lead', 'dba', 'analyst']

  return (
    <div className="glass glow-border-purple flex flex-col h-full min-h-0 rounded-2xl overflow-hidden bg-[#090d12]/95 relative">
      {/* Header Status Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 shrink-0 bg-[#0c1015]/80 select-none">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neon-purple animate-pulse shadow-[0_0_10px_#a855f7]" />
          <span className="font-display text-xs tracking-widest text-slate-100/90">SLACK — #incident-channel</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Active responders list */}
          <div className="hidden sm:flex items-center gap-2 text-[9px] border-r border-white/10 pr-3 mr-1">
            <span className="text-slate-500 uppercase tracking-wider font-bold">Active:</span>
            {activeRespondersList.map(rId => {
              const r = PARTICIPANTS[rId]
              const isCTO = rId === 'cto'
              return (
                <div key={rId} className="flex items-center gap-1 text-slate-400" title={`${r.name} - Online`}>
                  <span className={`w-1 h-1 rounded-full ${isCTO ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                  <span className="font-mono text-[9px]">{r.name.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
          <div className="font-mono text-[9px] text-slate-500">{isTyping ? '• typing...' : `${messages.length} logs`}</div>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-cyber min-h-0 bg-black/10">
        {messages.map((m, i) => {
          const isUser = m.isUser
          const p = !isUser ? (PARTICIPANTS[m.from.toLowerCase()] || PARTICIPANTS.manager) : null
          
          return (
            <div key={i} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <SenderBadge senderId={m.from} />
              
              <div className={`relative rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[75%] border shadow-sm ${
                isUser 
                  ? 'bg-neon-cyan/5 border-neon-cyan/20 text-slate-200' 
                  : `bg-[#0e131b]/80 text-slate-200 ${p ? p.bubbleBorder : 'border-white/5'}`
              }`}
              style={!isUser && p ? { borderLeft: `3px solid ${p.accent === 'purple' ? '#a855f7' : p.accent === 'blue' ? '#3b82f6' : p.accent === 'cyan' ? '#06b6d4' : p.accent === 'red' ? '#f43f5e' : p.accent === 'orange' ? '#f59e0b' : p.accent === 'green' ? '#10b981' : '#64748b'}` } : {}}>
                
                {!isUser && p && (
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/5 font-mono text-[8px] uppercase tracking-wider text-slate-500 select-none">
                    <span>{p.badge}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">{p.status}</span>
                  </div>
                )}
                
                <div className="font-sans leading-relaxed text-[11.5px]">
                  {isUser && m.target && (
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-neon-cyan/15 border border-neon-cyan/20 text-neon-cyan font-mono text-[9px] mr-1.5 uppercase select-none">
                      @{m.target.toUpperCase()}
                    </span>
                  )}
                  {m.text}
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Dynamic Typing Indicator message */}
        {isTyping && (
          <div className="flex items-center gap-2.5">
            <SenderBadge senderId={targetAgent} />
            <div className="rounded-xl border border-white/5 bg-[#0e131b]/80 px-3.5 py-2 text-cyan-400/90 font-mono text-[10.5px] tracking-wide animate-pulse flex items-center gap-2">
              <span>{TYPING_MESSAGES[targetAgent] || 'Active responder is reviewing logs...'}</span>
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Participant Selector Carousel + Interactive Toolbar */}
      <div className="shrink-0 border-t border-white/10 p-2.5 space-y-2.5 bg-[#0c1015]/90">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[8px] uppercase tracking-widest text-slate-500 font-bold px-1 select-none">Direct Message / Active Responder Select</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin flex-nowrap select-none">
            {Object.values(PARTICIPANTS).map(a => (
              <button
                key={a.id}
                onClick={() => setTargetAgent(a.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] border whitespace-nowrap shrink-0 transition-all duration-200 ${
                  targetAgent === a.id
                    ? `border-current ${a.colorClass} scale-105 shadow-sm`
                    : 'border-white/5 text-slate-500 bg-white/[0.01] hover:text-slate-350 hover:bg-white/[0.03]'
                }`}
              >
                <span>{a.emoji}</span>
                <span>{a.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={`Message @${targetAgent.toUpperCase()} (${PARTICIPANTS[targetAgent]?.name || 'Agent'})...`}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3.5 py-2 font-mono text-[11px] text-slate-200 placeholder-slate-650 focus:outline-none focus:border-neon-cyan/45 transition-colors"
          />
          <button
            onClick={send}
            disabled={isTyping || !input.trim()}
            className="px-4 py-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/35 text-neon-cyan font-mono text-[11px] font-bold hover:bg-neon-cyan/30 disabled:opacity-35 transition-all tracking-wider uppercase shadow-glowCyan"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}
