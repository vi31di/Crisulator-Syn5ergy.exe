/**
 * Syn5ergy v4 - Incident Communications Bridge Panel
 * Replaces hardcoded visual-novel loops with context-aware API streams.
 * Formatted like a professional chat-ops workspace interface (Slack/Teams/PagerDuty).
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, ShieldAlert, FileText } from 'lucide-react';
import { api } from '../data/api.js';

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
};

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
};

const getParticipant = (senderName) => {
  const lower = senderName.toLowerCase();
  if (lower.includes('cto')) return PARTICIPANTS.cto;
  if (lower.includes('manager')) return PARTICIPANTS.manager;
  if (lower.includes('lead') || lower.includes('sre')) return PARTICIPANTS.lead;
  if (lower.includes('dba') || lower.includes('database')) return PARTICIPANTS.dba;
  if (lower.includes('analyst') || lower.includes('security')) return PARTICIPANTS.analyst;
  if (lower.includes('soc')) return PARTICIPANTS.soc;
  if (lower.includes('comms') || lower.includes('pr') || lower.includes('journalist')) return PARTICIPANTS.comms;
  if (lower.includes('devops')) return PARTICIPANTS.devops;
  if (lower.includes('backend') || lower.includes('engineer')) return PARTICIPANTS.backend;
  if (lower.includes('product') || lower.includes('pm')) return PARTICIPANTS.pm;
  if (lower.includes('stakeholder')) return PARTICIPANTS.stakeholder;
  if (lower.includes('support')) return PARTICIPANTS.support;
  if (lower.includes('assistant') || lower.includes('ai') || lower.includes('sme')) return PARTICIPANTS.assistant;
  
  // Custom fallback dynamic alert profile
  return {
    id: senderName,
    name: senderName,
    emoji: '📡',
    badge: 'Operational Feed',
    accent: 'neutral',
    colorClass: 'border-slate-500/40 bg-slate-900/40 text-slate-400 hover:border-slate-400',
    bubbleBorder: 'border-slate-800/30',
    desc: 'External operations feed or command console output telemetry.',
    responsibility: 'Sends live events and contextual observations.',
    focus: 'Incident timeline synchronization.',
    status: 'Monitoring'
  };
};

function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center ml-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function SenderBadge({ senderName }) {
  const isUser = senderName === 'You';
  
  if (isUser) {
    return (
      <div className="shrink-0 mt-0.5 rounded-full border border-neon-cyan/45 bg-neon-cyan/10 text-neon-cyan px-2.5 py-0.5 font-mono text-[9px] whitespace-nowrap select-none">
        👤 Operator (You)
      </div>
    );
  }
  
  const p = getParticipant(senderName);
  
  return (
    <div className="relative group shrink-0 mt-0.5 select-none">
      <div className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] whitespace-nowrap cursor-help transition-all duration-200 ${p.colorClass}`}>
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
  );
}

export function IncidentBridge({ scenario, scenarioId, incidentPhase, timeline, onChat, rootCauseFound, externalMessage }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'System',
      content: 'Connected to Incident Bridge. Engineering leadership and response teams are active.',
      type: 'system'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState(null);
  const [isPlanToggle, setIsPlanToggle] = useState(false);
  const messagesEndRef = useRef(null);

  // Listen to external messages from terminal command executions
  useEffect(() => {
    if (externalMessage) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: externalMessage.sender,
          content: externalMessage.content,
          type: 'chat',
          time: externalMessage.time
        }
      ]);
    }
  }, [externalMessage]);

  // CTO feedback on root cause isolation
  useEffect(() => {
    if (rootCauseFound) {
      setMessages(prev => {
        if (prev.some(m => m.sender === 'CTO' && m.content.includes('Good catch'))) return prev;
        return [
          ...prev,
          {
            id: Date.now() + 100,
            sender: 'CTO',
            content: 'Good catch. That explains the saturation pattern.',
            type: 'chat',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    }
  }, [rootCauseFound]);

  // Phase tracker listener push
  useEffect(() => {
    if (!incidentPhase) return;

    const phaseMessages = {
      detection: 'Monitoring telemetry detected abnormal traffic behavior signatures.',
      investigation: 'SRE response units dispatched to trace downstream infrastructure bottlenecks.',
      escalation: 'Incident visibility escalated automatically to executive leadership.',
      mitigation: 'Remediation playbooks active. Monitoring metrics recovery coefficients.',
      recovery: 'System health restored to normal operational parameters.'
    };

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'System',
        content: phaseMessages[incidentPhase] || 'System telemetry metadata indexes updated.',
        type: 'system'
      }
    ]);
  }, [incidentPhase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastActiveRef = useRef(Date.now());

  // Reset idle timer when a message is added, a timeline action is logged, or an external command is executed
  useEffect(() => {
    lastActiveRef.current = Date.now();
  }, [messages.length, timeline?.length, externalMessage]);

  useEffect(() => {
    const timer = setInterval(() => {
      const idleTime = Date.now() - lastActiveRef.current;
      if (idleTime >= 120000) {
        // Pick a blameless contextual SRE reminder
        const idlePrompts = [
          { sender: 'Incident Manager', content: 'We have not received an update recently.' },
          { sender: 'CTO', content: 'This incident remains unresolved.' },
          { sender: 'SRE Lead', content: 'We need a mitigation plan.' }
        ];
        const randomPrompt = idlePrompts[Math.floor(Math.random() * idlePrompts.length)];
        
        setMessages(prev => {
          // Guard against duplicate consecutive messages
          if (prev.length > 0 && prev[prev.length - 1].content === randomPrompt.content) {
            return prev;
          }
          return [
            ...prev,
            {
              id: Date.now(),
              sender: randomPrompt.sender,
              content: randomPrompt.content,
              type: 'chat',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        });
        
        // Reset the active reference so we check again after 2 minutes
        lastActiveRef.current = Date.now();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [timeline?.length]);

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessageText = input.trim();
    const currentTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'You',
        content: userMessageText,
        type: 'chat',
        time: currentTimestamp,
        isPlan: isPlanToggle
      }
    ]);

    if (onChat) {
      onChat(userMessageText);
    }

    setInput('');
    const wasPlan = isPlanToggle;
    setIsPlanToggle(false);

    setIsTyping(true);

    // Intelligently rotate between multi-agent personas based on current incident conditions
    let activeAgentRole = wasPlan ? 'cto' : 'manager';
    const msgLower = userMessageText.toLowerCase();
    
    // Support tags for all dynamic participants
    let detectedKey = null;
    Object.keys(PARTICIPANTS).forEach(key => {
      if (msgLower.includes(`@${key}`)) {
        detectedKey = key;
      }
    });
    
    if (detectedKey) {
      activeAgentRole = detectedKey;
    } else {
      if (wasPlan) {
        activeAgentRole = 'cto';
      } else if (incidentPhase === 'escalation') {
        activeAgentRole = Math.random() > 0.5 ? 'manager' : 'cto';
      } else if (msgLower.includes('status') || msgLower.includes('eta')) {
        activeAgentRole = 'manager';
      } else {
        const options = ['manager', 'lead', 'backend', 'dba', 'devops'];
        activeAgentRole = options[Math.floor(Math.random() * options.length)];
      }
    }

    const targetLabel = activeAgentRole;
    setTypingAgent(targetLabel);

    try {
      const chatHistoryDump = messages.map(m => ({
        role: m.sender === 'You' ? 'user' : 'assistant',
        content: m.content
      }));

      // Use the actual participant name
      const backendAgentName = PARTICIPANTS[activeAgentRole]?.name || 'Incident Manager';

      const response = await api.agentChat({
        agent: backendAgentName,
        situation: scenario?.description || 'Active production system degradation.',
        scenario_id: scenarioId || 'retry_storm',
        user_message: userMessageText,
        history: chatHistoryDump,
        is_plan: wasPlan
      });

      // Maintain dynamic sender attribution
      const finalSender = PARTICIPANTS[activeAgentRole]?.name || 'Incident Manager';

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: finalSender,
          content: response.message || 'Acknowledged. Continuing active mitigation pathways.',
          type: 'chat',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error("Failed to fetch response context from the external API engine:", err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'System',
          content: 'Chat engine offline. Review local system playbooks and investigate logs.',
          type: 'chat',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
      setTypingAgent(null);
    }
  };

  const activeHeaderResponders = ['Incident Manager', 'CTO', 'SRE Lead', 'Database Admin', 'Security Analyst'];

  return (
    <div className="flex flex-col h-full bg-[#0a0f14] relative overflow-hidden font-mono text-slate-300">

      {/* Header bar status console */}
      <div className="bg-[#11161d] p-3 border-b border-slate-800 flex justify-between items-center z-20 shadow-panel select-none">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400 font-bold tracking-wider flex items-center gap-1.5">
            <MessageSquare size={13} className="text-slate-400" />
            INCIDENT CHANNEL
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400 font-semibold uppercase">{incidentPhase || 'DETECTION'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold border border-red-900/30 bg-red-950/20 px-2 py-0.5 rounded">
          <ShieldAlert size={11} />
          SECURE BRIDGE
        </div>
      </div>

      {/* Active dynamic responders list */}
      <div className="flex gap-4 px-4 py-1.5 border-b border-slate-900/60 bg-black/30 text-[9px] text-slate-500 select-none overflow-x-auto whitespace-nowrap scrollbar-none">
        <span className="uppercase font-bold tracking-wider">Active Responders:</span>
        {activeHeaderResponders.map(agent => {
          const isStressed = agent === 'CTO' && incidentPhase === 'escalation';
          return (
            <div key={agent} className="flex items-center gap-1 text-slate-450">
              <span className={`w-1 h-1 rounded-full ${isStressed ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
              {agent}
            </div>
          );
        })}
      </div>

      {/* Message Output Thread Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-0 scrollbar-ops bg-black/5 flex flex-col min-h-[200px]">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex w-full flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}
          >
            {msg.type === 'system' ? (
              <div className="w-full text-center my-1.5">
                <div className="inline-block text-slate-550 text-[10px] font-mono border border-slate-800/60 bg-black/30 rounded px-2.5 py-1.5 max-w-[95%] uppercase tracking-wide leading-normal">
                  SYSTEM INFO // {msg.content}
                </div>
              </div>
            ) : (
              <div className={`max-w-[80%] flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                <div className="mb-1">
                  <SenderBadge senderName={msg.sender} />
                </div>

                <div className={`p-2.5 rounded-xl text-xs leading-relaxed break-words whitespace-pre-wrap font-sans border shadow-sm
                  ${msg.sender === 'You'
                    ? (msg.isPlan 
                        ? 'bg-blue-950/30 border-2 border-blue-500/50 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                        : 'bg-neon-cyan/5 border-neon-cyan/20 text-slate-200')
                    : `bg-[#11161d] border-slate-800/80 text-slate-300`
                  }`}
                  style={msg.sender !== 'You' ? { borderLeft: `3px solid ${getParticipant(msg.sender).accent === 'purple' ? '#a855f7' : getParticipant(msg.sender).accent === 'blue' ? '#3b82f6' : getParticipant(msg.sender).accent === 'cyan' ? '#06b6d4' : getParticipant(msg.sender).accent === 'red' ? '#f43f5e' : getParticipant(msg.sender).accent === 'orange' ? '#f59e0b' : getParticipant(msg.sender).accent === 'green' ? '#10b981' : '#64748b'}` } : {}}>
                  
                  {msg.sender !== 'You' && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/5 font-mono text-[8px] uppercase tracking-wider text-slate-500 select-none">
                      <span>{getParticipant(msg.sender).badge}</span>
                      <span>•</span>
                      <span className="text-cyan-400 font-bold">{getParticipant(msg.sender).status}</span>
                    </div>
                  )}

                  {msg.isPlan && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-400 mb-1.5 border-b border-blue-500/30 pb-1 uppercase tracking-wide font-mono">
                      <FileText size={10} />
                      FORMAL IMPLEMENTATION PLAN
                    </div>
                  )}
                  {msg.content}
                </div>

                <div className="text-[9px] text-slate-600 font-mono mt-1 px-1 select-none">
                  {msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {isTyping && typingAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-white/5 bg-[#0e131b]/80 px-3.5 py-2 text-cyan-400/90 font-mono text-[10.5px] tracking-wide animate-pulse flex items-center gap-2 w-fit"
            >
              <span>
                {isPlanToggle 
                  ? 'CTO is reviewing formal implementation plan...' 
                  : (TYPING_MESSAGES[typingAgent] || 'Active responder is reviewing logs...')}
              </span>
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Form Footer Panel */}
      <div className="flex flex-col bg-[#11161d] border-t border-slate-800 shrink-0">
        <div className="px-3 py-2 border-b border-slate-800/50 flex items-center gap-2 select-none">
          <input 
            type="checkbox" 
            id="plan-toggle"
            checked={isPlanToggle}
            onChange={(e) => setIsPlanToggle(e.target.checked)}
            className="w-3 h-3 rounded border-slate-600 text-blue-500 focus:ring-0 cursor-pointer bg-black/40"
          />
          <label htmlFor="plan-toggle" className={`text-[10px] font-bold tracking-wide cursor-pointer transition-colors ${isPlanToggle ? 'text-blue-400' : 'text-slate-500'}`}>
            SUBMIT AS FORMAL IMPLEMENTATION PLAN FOR CTO APPROVAL
          </label>
        </div>
        
        <form onSubmit={handleMessageSubmit} className="p-2.5 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isPlanToggle ? "Write your mitigation strategy here for CTO approval..." : "Send update (e.g. tag @lead or @cto)..."}
            className={`flex-1 bg-[#0a0f14] rounded px-3 py-1.5 border focus:outline-none font-sans text-xs placeholder:opacity-30 placeholder:italic transition-colors ${
              isPlanToggle 
                ? 'text-blue-100 border-blue-900/50 focus:border-blue-500/50' 
                : 'text-slate-200 border-slate-800 focus:border-slate-650'
            }`}
            autoComplete="off"
          />
          <button
            type="submit"
            className={`${isPlanToggle ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border-blue-900/50 hover:border-blue-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700 hover:border-slate-600'} px-4.5 py-1.5 rounded border transition-colors flex items-center justify-center shrink-0`}
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default IncidentBridge;