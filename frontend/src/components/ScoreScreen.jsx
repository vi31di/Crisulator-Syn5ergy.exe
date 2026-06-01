import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, Award, FileText, RefreshCw, AlertTriangle, ArrowRight, Eye, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { incidentState } from '../data/api';

const getGraphicsForKey = (keyText) => {
    if (typeof keyText !== 'string') return '🔹';
    const key = keyText.toLowerCase().trim();
    
    // Stakeholder & Business Impact
    if (key.includes('manager trust')) return '💼';
    if (key.includes('executive confidence')) return '👑';
    if (key.includes('customer impact')) return '👥';
    if (key.includes('public trust')) return '⚖️';
    
    // Incident Retro Keys
    if (key.includes('summary') || key.includes('incident') || key.includes('brief') || key.includes('explanation') || key.includes('overview')) return '📋';
    if (key.includes('win condition') || key.includes('success criteria')) return '🎯';
    if (key.includes('lose condition') || key.includes('failure mode')) return '❌';
    if (key.includes('root cause') || key.includes('rca') || key.includes('causality')) return '🔬';
    if (key.includes('optimal path') || key.includes('remediation') || key.includes('remedial') || key.includes('opportunity') || key.includes('directive')) return '💡';
    if (key.includes('causal link') || key.includes('causal analysis') || key.includes('command')) return '💻';
    if (key.includes('isolated clue') || key.includes('isolated indicator') || key.includes('clue')) return '🔎';
    if (key.includes('diagnostic failure') || key.includes('diagnostic error') || key.includes('missed clues')) return '⚠️';
    if (key.includes('action item') || key.includes('remediation directive')) return '⚡';
    if (key.includes('went well') || key.includes('correct')) return '🟢';
    if (key.includes('went wrong') || key.includes('gap') || key.includes('mistake') || key.includes('wrong')) return '🔴';

    return '🔹';
};

const extractCardData = (children) => {
    const flat = [];
    const flatten = (node) => {
        if (React.isValidElement(node)) {
            if (node.type === 'p') {
                React.Children.forEach(node.props.children, flatten);
            } else {
                flat.push(node);
            }
        } else if (Array.isArray(node)) {
            node.forEach(flatten);
        } else {
            flat.push(node);
        }
    };
    React.Children.forEach(children, flatten);

    const first = flat[0];
    const isStrong = first && (first.type === 'strong' || first.props?.node?.type === 'strong');
    
    if (isStrong) {
        const keyText = React.Children.toArray(first.props.children || first).join('').replace(/:$/, '').trim();
        let descContent = flat.slice(1);
        if (descContent.length > 0 && typeof descContent[0] === 'string') {
            const trimmed = descContent[0].replace(/^:\s*/, '');
            if (trimmed === '') descContent = descContent.slice(1);
            else descContent = [trimmed, ...descContent.slice(1)];
        }
        return { isCard: true, keyText, descContent };
    }
    return { isCard: false };
};

// ── OBSERVABILITY INTERACTIVE SUB-COMPONENTS ───────────────────

const AmbientParticles = ({ color }) => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
            {Array.from({ length: 15 }).map((_, i) => {
                const size = Math.random() * 3 + 2;
                const left = Math.random() * 100;
                const top = Math.random() * 100;
                const delay = Math.random() * 5;
                const duration = Math.random() * 8 + 8;
                
                return (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -70, 0],
                            x: [0, Math.random() * 20 - 10, 0],
                            opacity: [0.1, 0.5, 0.1]
                        }}
                        transition={{
                            duration: duration,
                            repeat: Infinity,
                            delay: delay,
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            width: size,
                            height: size,
                            borderRadius: '50%',
                            backgroundColor: color,
                            left: `${left}%`,
                            top: `${top}%`,
                        }}
                    />
                );
            })}
        </div>
    );
};

const ServiceGraph = ({ isPositive, serviceName, color }) => {
    return (
        <div className="border border-ops-border/60 bg-[#070b10]/40 rounded-xl p-5 my-5 relative overflow-hidden shadow-inner select-none">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold mb-4">Observability Service Map Network</div>
            <div className="relative h-44 flex items-center justify-between px-8 bg-black/20 rounded-lg border border-slate-900/60 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                
                {/* Node 1: Client Gateway */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-300 shadow-md">
                        👥
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-slate-450 uppercase">Clients</span>
                </div>

                {/* Animated Connection 1 */}
                <div className="flex-1 h-[2px] bg-slate-800 mx-2 relative overflow-hidden">
                    <motion.div 
                        animate={{ x: ['-100%', '100%'] }} 
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className={`absolute inset-y-0 w-12 bg-gradient-to-r from-transparent ${isPositive ? 'via-green-500' : 'via-yellow-500'} to-transparent`}
                    />
                </div>

                {/* Node 2: Gateway / Ingress Router */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className={`h-12 w-12 rounded-xl border ${isPositive ? 'border-green-500/40 bg-green-950/20' : 'border-yellow-500/40 bg-yellow-950/20'} flex items-center justify-center text-slate-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]`}>
                        📡
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-slate-300 uppercase">Ingress GW</span>
                </div>

                {/* Animated Connection 2 */}
                <div className="flex-1 h-[2px] bg-slate-800 mx-2 relative overflow-hidden">
                    <motion.div 
                        animate={{ x: ['-100%', '100%'] }} 
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className={`absolute inset-y-0 w-12 bg-gradient-to-r from-transparent ${isPositive ? 'via-green-500' : 'via-red-500'} to-transparent`}
                    />
                </div>

                {/* Node 3: Target Microservice */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className={`h-14 w-14 rounded-xl border ${isPositive ? 'border-green-500 bg-green-950/30' : 'border-red-500 bg-red-950/30 animate-pulse'} flex flex-col items-center justify-center text-slate-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]`}>
                        <span className="text-lg">⚙️</span>
                    </div>
                    <span className="text-[9px] font-mono font-extrabold text-purple-400 truncate max-w-[80px] text-center uppercase" title={serviceName}>{serviceName}</span>
                </div>

                {/* Animated Connection 3 */}
                <div className="flex-1 h-[2px] bg-slate-800 mx-2 relative overflow-hidden">
                    <motion.div 
                        animate={{ x: ['-100%', '100%'] }} 
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className={`absolute inset-y-0 w-12 bg-gradient-to-r from-transparent ${isPositive ? 'via-green-500' : 'via-red-500 animate-pulse'} to-transparent`}
                    />
                </div>

                {/* Node 4: Database Storage */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className={`h-11 w-11 rounded-xl border ${isPositive ? 'border-green-500/40 bg-green-950/20' : 'border-red-500/40 bg-red-950/20'} flex items-center justify-center text-slate-200 shadow-md`}>
                        🗄️
                    </div>
                    <span className="text-[9px] font-mono font-semibold text-slate-450 uppercase">Backend DB</span>
                </div>
            </div>
            <div className="mt-3 flex justify-between items-center text-[10px] text-slate-450 font-sans px-1">
                <div>Operational Path Status: <span className={isPositive ? 'text-green-400 font-bold' : 'text-red-400 font-bold animate-pulse'}>{isPositive ? 'STABLE RETRY QUEUES' : 'CONNECTION POOL SATURATED / DEADLOCKS'}</span></div>
                <div>Downstream Traffic: <span className="font-mono text-slate-200">{isPositive ? '99.98%' : '< 40.00% SLA'}</span></div>
            </div>
        </div>
    );
};

const RootCauseSpotlight = ({ content, optimalPath, isPositive, color, roleText }) => {
    const [deepMode, setDeepMode] = useState(false);
    return (
        <div className="border border-ops-border/75 bg-[#070b10]/60 rounded-xl p-5 my-4 shadow-panel relative overflow-hidden group select-none">
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color }} />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-base">🔬</span>
                    <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold">Root Cause Spotlight Card</span>
                </div>
                <button
                    onClick={() => setDeepMode(!deepMode)}
                    className="px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/50 text-[9px] font-mono text-slate-400 transition-colors uppercase font-bold"
                >
                    {deepMode ? 'Switch to Flowchart Mode' : 'Switch to Technical Details'}
                </button>
            </div>

            <div className="text-[11px] leading-relaxed text-slate-350 font-sans ml-0 sm:ml-7">
                {deepMode ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3.5">
                        <div className="p-3.5 bg-black/30 border border-slate-850 rounded-lg text-slate-300">
                            <span className="font-mono text-[9px] text-slate-500 block uppercase mb-1">RCA Technical Analysis</span>
                            <div className="text-xs leading-relaxed">{content}</div>
                        </div>
                        {optimalPath && (
                            <div className="p-3.5 bg-green-950/10 border border-green-900/20 rounded-lg text-slate-300">
                                <span className="font-mono text-[9px] text-green-400 block uppercase mb-1 font-bold">Optimal Mitigation Directive</span>
                                <div className="text-xs leading-relaxed">{optimalPath}</div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3 text-center">
                            <div className="bg-black/30 border border-slate-850 rounded p-2.5">
                                <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">1. Trigger Phase</div>
                                <div className="text-[10px] text-slate-200 font-semibold font-sans">Administrative Error / Flap</div>
                            </div>
                            <div className="bg-red-950/10 border border-red-900/20 rounded p-2.5 animate-pulse">
                                <div className="text-[9px] text-red-400 font-mono uppercase mb-1 font-bold">2. Technical Bottleneck</div>
                                <div className="text-[10px] text-slate-200 font-semibold font-sans">Saturated Downstream Pool</div>
                            </div>
                            <div className="bg-black/30 border border-slate-850 rounded p-2.5">
                                <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">3. Consequence</div>
                                <div className="text-[10px] text-slate-200 font-semibold font-sans">Ingress Queue Dropping Traffic</div>
                            </div>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-350 font-sans italic text-center">
                            Flowchart indicates query connection starvation and pod reboots propagating network storms.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const InteractiveTimeline = ({ timeline, color }) => {
    const [expandedEvent, setExpandedEvent] = useState(null);
    return (
        <div className="my-5 relative pl-6 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-850 space-y-4 select-none">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold mb-4 -ml-6">Chronological Incident Waypoints</div>
            {timeline.length === 0 ? (
                <div className="text-slate-650 text-xs italic pl-6 font-sans">No timeline metrics captured.</div>
            ) : (
                timeline.map((event, idx) => {
                    const isExpanded = expandedEvent === idx;
                    return (
                        <div key={idx} className="relative group">
                            {/* Connector node indicator */}
                            <button 
                                onClick={() => setExpandedEvent(isExpanded ? null : idx)}
                                className="absolute left-0 top-1 w-3 h-3 rounded-full border transition-all duration-300 z-10 -translate-x-[22.5px] cursor-pointer"
                                style={{
                                    backgroundColor: isExpanded ? color : '#070b10',
                                    borderColor: isExpanded ? color : '#475569',
                                    boxShadow: isExpanded ? `0 0 10px ${color}` : 'none'
                                }}
                            />
                            
                            <div className={`border rounded-xl p-3.5 transition-all ml-2 ${
                                isExpanded 
                                    ? 'border-purple-500/30 bg-purple-950/5 shadow-[0_4px_15px_rgba(0,0,0,0.4)]' 
                                    : 'border-slate-850 bg-[#070b10]/40 hover:bg-[#0b1016]/40 hover:border-slate-800'
                            }`}>
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedEvent(isExpanded ? null : idx)}>
                                    <span className="font-mono text-[9px] text-purple-400 font-bold tracking-wider">{event.time}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">{isExpanded ? 'Collapse' : 'Inspect'}</span>
                                </div>
                                <div className="text-[11px] leading-relaxed text-slate-200 font-sans mt-1.5 break-all">
                                    {typeof event?.text === 'string' ? event.text.split('. Feedback:')[0] : ''}
                                </div>
                                
                                {isExpanded && typeof event?.text === 'string' && event.text.includes('. Feedback:') && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }} 
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-2.5 pt-2.5 border-t border-slate-900/60 text-[10px] text-slate-450 font-mono leading-relaxed"
                                    >
                                        <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">TELEMETRY ACTION RESPONSE:</span>
                                        {event.text.split('. Feedback:')[1]}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

const OperatorActionsJourney = ({ actions, finalScore, archetype, archetypeDetails, color, roleBadge }) => {
    const invDepth = Math.min(100, Math.round(finalScore * 1.15));
    const mutationSafety = finalScore >= 50 ? Math.min(100, Math.round(50 + finalScore * 0.45)) : Math.round(finalScore * 0.7);
    const slaSpeed = Math.min(100, Math.round(finalScore * 0.95));

    return (
        <div className="space-y-5 select-none">
            {/* Operator Stat Grid */}
            <div className="border border-ops-border/75 bg-[#070b10]/60 rounded-xl p-5 shadow-panel relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold mb-3.5">Incident Response Vector Analysis</div>
                
                <div className="space-y-3.5">
                    <div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 mb-1">
                            <span>Investigation Scope Depth</span>
                            <span className="font-bold text-purple-400">{invDepth}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 border border-slate-850 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${invDepth}%` }} transition={{ duration: 1 }} className="h-full bg-purple-500" />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 mb-1">
                            <span>Mutation Safety Profile</span>
                            <span className="font-bold text-blue-400">{mutationSafety}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 border border-slate-850 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${mutationSafety}%` }} transition={{ duration: 1 }} className="h-full bg-blue-500" />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-300 mb-1">
                            <span>SLA Stabilization Speed</span>
                            <span className="font-bold text-green-400">{slaSpeed}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 border border-slate-850 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${slaSpeed}%` }} transition={{ duration: 1 }} className="h-full bg-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="space-y-3.5">
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Mitigation Steps Logged</div>
                {actions.length === 0 ? (
                    <div className="p-4 border border-red-500/20 bg-red-950/5 text-slate-400 text-xs italic font-sans rounded-xl">
                        ⚠️ Zero commands dispatched. Operator was in inactive observation state throughout the incident.
                    </div>
                ) : (
                    (Array.isArray(actions) ? actions : []).map((act, index) => {
                        const actStr = typeof act === 'string' ? act : String(act || '');
                        let badgeText = 'Diagnostics';
                        let badgeColor = 'bg-blue-950/40 text-blue-400 border-blue-900/30';
                        if (actStr.includes('restart') || actStr.includes('reboot')) {
                            badgeText = 'System Reboot';
                            badgeColor = 'bg-yellow-950/40 text-yellow-400 border-yellow-900/30';
                        } else if (actStr.includes('scale')) {
                            badgeText = 'Pod Scaling';
                            badgeColor = 'bg-green-950/40 text-green-400 border-green-900/30';
                        } else if (actStr.includes('kubectl')) {
                            badgeText = 'Cluster mutation';
                            badgeColor = 'bg-purple-950/40 text-purple-400 border-purple-900/30';
                        }

                        return (
                            <div key={index} className="border border-ops-border/75 bg-[#070b10]/60 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-700 group-hover:bg-purple-500 transition-colors" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[9px] text-slate-500">STEP {index + 1}</span>
                                        <code className="px-1.5 py-0.5 rounded bg-black/40 border border-slate-800 text-[10px] text-purple-300 font-mono font-bold">{actStr}</code>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${badgeColor}`}>
                                        {badgeText}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const FindingsCarousel = ({ discoveries }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const list = discoveries && discoveries.length ? discoveries : [
        "Diagnostic trace isolated CrashLoopBackOff states in DB connector namespaces.",
        "Identified 100% query failure cascade on downstream postgres connection pool.",
        "Observed connection queues saturating network sockets at upstream ingress routers."
    ];

    return (
        <div className="border border-ops-border/75 bg-[#070b10]/60 rounded-xl p-5 my-4 shadow-panel relative overflow-hidden select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-4">
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Investigation Discovery Carousel</div>
                <div className="font-mono text-[9px] text-slate-500">FINDING {currentIndex + 1} OF {list.length}</div>
            </div>

            <div className="min-h-[100px] flex items-center justify-center py-4">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="text-center w-full px-8"
                    >
                        <div className="text-3xl mb-3">🔎</div>
                        <p className="text-slate-200 font-sans text-xs leading-relaxed font-semibold max-w-xl mx-auto">
                            {list[currentIndex]}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-4 flex justify-between items-center border-t border-slate-900/60 pt-3">
                <div className="flex gap-1">
                    {list.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-3.5 bg-purple-500' : 'w-1.5 bg-slate-800 hover:bg-slate-700'}`}
                        />
                    ))}
                </div>
                <div className="flex gap-1.5 font-mono text-[9px]">
                    <button 
                        onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                        disabled={currentIndex === 0}
                        className="px-2 py-1 rounded border border-slate-850 hover:border-slate-700 hover:bg-slate-900/50 disabled:opacity-30 text-slate-400 transition-colors uppercase font-bold"
                    >
                        &larr; Prev
                    </button>
                    <button 
                        onClick={() => setCurrentIndex(c => Math.min(list.length - 1, c + 1))}
                        disabled={currentIndex === list.length - 1}
                        className="px-2 py-1 rounded border border-slate-855 hover:border-slate-700 hover:bg-slate-900/50 disabled:opacity-30 text-slate-400 transition-colors uppercase font-bold"
                    >
                        Next &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

const StrategicRemediationBoard = ({ recommendations, color }) => {
    const items = recommendations && recommendations.length ? recommendations : [
        { title: "Routine Observability Audits", desc: "Maintain routine telemetry audits and implement proactive staging tests.", prio: "STABLE COMPLIANCE", color: "border-green-500/20 bg-green-950/5 text-green-400" },
        { title: "Study system dependency mappings", desc: "Refrain from speculative mutations under load, and verify command prerequisites.", prio: "CRITICAL ACTION REQUIRED", color: "border-red-500/20 bg-red-950/5 text-red-400" }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 select-none">
            {items.map((item, idx) => (
                <div key={idx} className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-panel relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-700 group-hover:bg-purple-500 transition-colors" />
                    <div className="flex justify-between items-start mb-2.5 gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">OPPORTUNITY {idx + 1}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${item.color || 'border-slate-800 text-slate-400 bg-slate-900/50'}`}>
                            {item.prio || 'ACTION ITEM'}
                        </span>
                    </div>
                    <div className="text-xs text-slate-100 font-bold font-mono mb-2">{item.title}</div>
                    <p className="text-[11px] leading-relaxed text-slate-350 font-sans">{item.desc}</p>
                </div>
            ))}
        </div>
    );
};

// ── MAIN OBSERVABILITY WORKSPACE RETRO COMPONENT ───────────────

const ScoreScreen = ({ 
    scenario: propScenario, 
    timeline: propTimeline, 
    actions: propActions, 
    incidentData: propIncidentData, 
    finalScore: propFinalScore, 
    onRestart 
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location?.state || {};

    // Extract variables with prop priority and location state fallback
    const scenario = propScenario || state.scenario || {};
    if (state.scenarioId && !scenario.id) {
        scenario.id = state.scenarioId;
    }

    const finalScore = propFinalScore !== undefined ? propFinalScore : (state.score !== undefined ? state.score : 0);

    const incidentData = propIncidentData || {
        role: state.role || 'oncall',
        score: finalScore,
        userId: 'Operator_01'
    };

    const actions = propActions || (state.actionLog || []).map(a => a.command || a.action).filter(Boolean);

    const timeline = propTimeline || (state.actionLog || []).map((a, idx) => ({
        time: `Step ${idx + 1}`,
        text: `Executed command: ${a.command || a.action}. Feedback: ${a.feedback || 'Command logged.'}`
    }));

    const handleRestart = onRestart || (() => navigate('/roles'));

    const [postmortem, setPostmortem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState(0);
    const [reviewedSections, setReviewedSections] = useState({ 0: true });

    // Safe extraction parameters fallback if structural parameters aren't populated cleanly
    const currentRole = incidentData?.role || 'oncall';
    const currentUsername = incidentData?.userId || 'anonymous';

    useEffect(() => {
        setReviewedSections(prev => ({ ...prev, [activeSection]: true }));
    }, [activeSection]);

    // Role-specific dynamic style tokens
    const isCyber = currentRole === 'cyber' || currentRole === 'security';
    const isPR = currentRole === 'pr' || currentRole === 'comms';
    const roleAccentColor = isCyber ? '#f43f5e' : isPR ? '#a855f7' : '#10b981'; // rose, purple, emerald
    const roleText = isCyber ? 'text-rose-455' : isPR ? 'text-purple-400' : 'text-emerald-400';
    const roleBorder = isCyber ? 'border-rose-500/20' : isPR ? 'border-purple-500/20' : 'border-emerald-500/20';
    const roleGlowShadow = isCyber ? 'shadow-[0_0_15px_rgba(244,63,94,0.15)]' : isPR ? 'shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    const roleLeftBar = isCyber ? 'bg-rose-500/40 group-hover:bg-rose-500' : isPR ? 'bg-purple-500/40 group-hover:bg-purple-500' : 'bg-emerald-500/40 group-hover:bg-emerald-500';
    const roleBadge = isCyber ? 'bg-rose-950/40 text-rose-450 border-rose-900/30' : isPR ? 'bg-purple-950/40 text-purple-400 border-purple-900/30' : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30';

    // ── SCOPED INCIDENT STATUS & PERFORMANCE PROFILE (Scoping Fix) ────────────────
    const operationalStatus = finalScore >= 50 ? "STABILIZED & RECOVERED" : "SEVERE SYSTEM DEGRADATION / CRITICAL DOWN";
    
    let archetype = "Standard SRE Operational Recovery";
    let archetypeDetails = "Stabilized the cluster within reasonable SLA windows, preserving core database boundaries and client traffic.";
    let toneEmoji = "🟢 [STANDARD MITIGATION]";

    if (actions.length === 0) {
        archetype = "Inactivity / Silent Watcher";
        archetypeDetails = "The operator failed to begin active investigation procedures before the incident escalated. The operational team failed to establish a diagnostic foothold.";
        toneEmoji = "🔴 [INACTIVITY FAILURE]";
    } else if (finalScore < 50 && actions.length > 5) {
        archetype = "Reckless Operator";
        archetypeDetails = "Executed a high frequency of state-mutating commands and system modifications without verifying diagnostic prerequisites, resulting in cascading error propagation.";
        toneEmoji = "🔴 [RECKLESS OPERATION]";
    } else if (Array.isArray(actions) && actions.some((val, i) => actions.indexOf(val) !== i)) {
        archetype = "Tunnel Vision / Investigative Loop";
        archetypeDetails = "Repeated duplicate diagnostic scripts or log extractions, failing to expand investigative scope or execute mitigating commands.";
        toneEmoji = "🟡 [TUNNEL VISION]";
    } else if (finalScore < 50 && Array.isArray(actions) && actions.some(a => {
        const aStr = typeof a === 'string' ? a : String(a || '');
        return aStr.includes("restart") || aStr.includes("reboot") || aStr.includes("rollback") || aStr.includes("scale");
    })) {
        archetype = "Panic Rollback / Premature Restart";
        archetypeDetails = "Triggered speculative reboots or configuration rollbacks on critical components while upstream db pools were saturated, magnifying retry loops and connection starvation.";
        toneEmoji = "🔴 [PANIC REACTION]";
    } else if (finalScore < 50 && (currentRole === 'pr' || currentRole === 'comms')) {
        archetype = "Public Relations & Communication Collapse";
        archetypeDetails = "Exposed severe company liability, provided contradictory ETAs to executive leaders, or failed to establish stakeholder transparency under pressure.";
        toneEmoji = "🔴 [COMMUNICATIONS FAILURE]";
    } else if (finalScore >= 80) {
        archetype = "Elite SRE / Proactive Triage";
        archetypeDetails = "Demonstrated stellar cognitive control, minimal command footprint, rapid diagnostic isolation, and optimal deployment of mitigation playbooks.";
        toneEmoji = "🟢 [ELITE SRE SUCCESS]";
    }

    useEffect(() => {
        const fetchPostmortem = async () => {
            try {
                const baseApiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

                // Post analytical incident history variables over to our telemetry engine with 12s timeout limit
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);

                let data;
                try {
                    const res = await fetch(`${baseApiUrl}/agents/postmortem`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            scenario_id: scenario.id,
                            actions: actions,
                            timeline: timeline.map(t => `[${t.time}] ${t.text}`),
                            score: finalScore,
                            role: currentRole,
                            scenario_title: scenario.title || '',
                            scenario_service: scenario.service || '',
                            scenario_severity: scenario.severity || '',
                            scenario_description: scenario.description || '',
                            successful_actions: incidentState.successfulActions || [],
                            failed_actions: incidentState.failedActions || [],
                            discoveries: incidentState.discoveries || []
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.status === 404) {
                        throw new Error("Operational retrospective API endpoint not found (404). Backend routing is desynchronized.");
                    }
                    if (res.status === 500) {
                        throw new Error("Internal site reliability server error (500) encountered while synthesizing postmortem.");
                    }
                    if (!res.ok) {
                        throw new Error(`Triage registry returned unexpected HTTP status: ${res.status}`);
                    }

                    const text = await res.text();
                    try {
                        data = JSON.parse(text);
                    } catch (jsonErr) {
                        throw new Error("Telemetry response stream contains invalid JSON syntax. Compilation aborted.");
                    }
                } catch (fetchErr) {
                    clearTimeout(timeoutId);
                    if (fetchErr.name === 'AbortError') {
                        throw new Error("Simulation analytics extraction pipeline request timed out (12-second limit exceeded).");
                    }
                    throw fetchErr;
                }

                if (!data || !data.postmortem || (typeof data.postmortem === 'string' && (data.postmortem.includes("expired") || data.postmortem.includes("not found")))) {
                    throw new Error("Active session expired or invalid. Falling back to local synthesis.");
                }
                setPostmortem(data.postmortem);

                // Push final metrics payload directly onto the central score log tracking indices with timeout protection
                const lbController = new AbortController();
                const lbTimeoutId = setTimeout(() => lbController.abort(), 12000);
                try {
                    const res = await fetch(`${baseApiUrl}/leaderboard/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            scenario_id: scenario.id,
                            role: currentRole,
                            score: finalScore,
                            time_taken: timeline.length * 60, // Extrapolate clock calculations from timeline ticks
                            username: currentUsername
                        }),
                        signal: lbController.signal
                    });
                    clearTimeout(lbTimeoutId);
                    if (!res.ok) {
                        console.warn(`Leaderboard metrics submission returned warning status: ${res.status}`);
                    }
                } catch (lbErr) {
                    clearTimeout(lbTimeoutId);
                    console.error("Leaderboard submit error:", lbErr);
                }

            } catch (err) {
                console.error("Failed to compile internal postmortem analysis reports:", err);
                
                // Scenario metadata map
                const scenarioDetails = {
                    aws_s3_outage: {
                        title: "US-EAST-1 S3 Outage Cascades",
                        service: "s3-connector / postgres-db",
                        desc: "A high-frequency administrative command error removed core storage subsystem routing entries, breaking downstream applications.",
                        rootCause: "Recursive retry storms on the s3-connector service saturated postgres connection pools, causing connection starvation and backend service CrashLoopBackOffs.",
                        optimalPath: "Verify connector connection status with 'kubectl logs s3-connector', scale connector replicas or implement circuit-breaker middleware to isolate upstream latency, flush pg pool, and verify metrics."
                    },
                    cloudflare_global_outage: {
                        title: "Cloudflare Edge DNS Disruption",
                        service: "edge-gateway / origin-ingress",
                        desc: "Global DNS queries timed out at edge nodes, causing load balancers to route 100% of client traffic to backup origins.",
                        rootCause: "Edge CDN routing failure diverted raw unthrottled search traffic straight to single-node backup ingress servers, inducing CPU saturation and thread-pool lockup.",
                        optimalPath: "Assess edge propagation status, apply rate-limiting rules at load balancer levels to throttle incoming surges, and scale edge ingress pool replicas."
                    },
                    retry_storm: {
                        title: "Gateway Retry Storm Amplification",
                        service: "gateway-api / user-database",
                        desc: "A minor network latency flap induced aggressive client retry loops without exponential backoff policies, saturating backend pools.",
                        rootCause: "High-frequency un-throttled query amplification saturated postgres DB connections pool, starving the user authorization service.",
                        optimalPath: "Assess DB pool saturation thresholds, deploy aggressive ingress API throttling, activate circuit-breaker policies, and verify downstream pool recovery."
                    }
                };

                const scenarioMeta = scenarioDetails[scenario.id] || {
                    title: scenario.title || "Incident Simulation",
                    service: scenario.service || "production-microservice",
                    desc: scenario.description || "A critical resource or configuration constraint triggered downstream operational failures.",
                    rootCause: "Systemic latency amplification and thread-pool exhaustion under peak connection stress.",
                    optimalPath: "Investigate target service logs, check connection thresholds, scale system pod capacity, and apply rate-limiting rules."
                };

                // Scoped narrative summaries for the fallback autopsy report
                const narrativeSummary = finalScore >= 50
                    ? "The target cluster has been successfully restored to a healthy state. Metrics show system latency and connection queues have fully returned to baseline thresholds."
                    : (actions.length === 0
                        ? "No meaningful mitigation effort was attempted before systemic degradation completed. The platform remained fully vulnerable throughout the entire outage window."
                        : "Mitigation efforts failed to recover the target system within acceptable downtime windows. Saturated downstream resources continued to drop client requests, exceeding service-level agreement thresholds.");

                const strategicRemediation = finalScore >= 50
                    ? "Maintain routine telemetry audits and implement proactive staging tests to verify SRE playbooks."
                    : "IMMEDIATE REMEDIAL INSTRUCTION: The operator must study system dependency mappings, strictly refrain from speculative mutations under load, and verify command prerequisites.";

                // 3. Causality & Actions Map
                let causalitySection = "";
                if (!Array.isArray(actions) || actions.length === 0) {
                    causalitySection = `* **Causal Link**: Zero terminal commands dispatched. By executing no investigative or restorative scripts, the root cause was left fully unchecked, allowing a minor microservice latency spike to escalate into a total gateway block.`;
                } else {
                    causalitySection = actions.map((act, index) => {
                        const actStr = typeof act === 'string' ? act : String(act || '');
                        let link = "Provided general telemetry diagnostics.";
                        if (actStr.includes("logs") || actStr.includes("describe")) {
                            link = "Inspected container internals, helping isolate root cause configurations.";
                        } else if (actStr.includes("restart") || actStr.includes("reboot")) {
                            link = finalScore < 50 
                                ? "Triggered container reboot under peak load, wiping transaction state and amplifying query connection storms."
                                : "Refreshed service resources, clearing hung memory buffers and helping stabilize request queues.";
                        } else if (actStr.includes("scale")) {
                            link = "Adjusted active replica thresholds, helping absorb traffic volume anomalies.";
                        }
                        return `* **Command [${index + 1}]**: \`${actStr}\` -> *Causality Analysis*: ${link}`;
                    }).join('\n');
                }

                // 4. Investigation Analysis (Clues & Discoveries)
                const discoveryLogs = incidentState.discoveries && incidentState.discoveries.length
                    ? incidentState.discoveries.map(d => `* **Isolated Clue**: Successfully isolated anomaly trace - \`${d}\`.`).join('\n')
                    : actions.length === 0
                        ? "* **Diagnostic Failure**: Operator did not engage in investigation. Zero diagnostic traces were mapped."
                        : "* **Missed Clues**: Active console traces showed CrashLoopBackOff and socket errors, but the operator did not isolate these indicators to a specific database pool boundary.";

                // 5. Timeline Generation (Chronological actual timeline table)
                const timelineRows = timeline.length
                    ? timeline.map(t => `| ${t.time || '--:--:--'} | ${(t.text || t.feedback || 'Operational event trace logged.').replace(/\|/g, '\\|')} |`).join('\n')
                    : "| --:--:-- | Operator failed to capture baseline event sequences. |";

                // 6. Stakeholder & Business Consequences
                let stakeholderConsequences = `* **Manager Trust**: Maintained at high levels due to professional resolution pace.
* **Executive Confidence**: Stable; ETAs matched actual remediation progress.
* **Customer Impact**: Minimal; request error rates stabilized before exceeding SLA breach thresholds.
* **Public Trust & Legal Liability**: Zero exposure; incident was resolved internally without data loss or breach disclosure requirements.`;

                if (finalScore < 50) {
                    stakeholderConsequences = `* **Manager Trust**: Collapse. No clear status timeline updates were dispatched, causing escalation up the management tier.
* **Executive Confidence**: Destroyed. Premature promises or total inaction left leadership without viable path projections.
* **Customer Impact**: High. Thousands of premium clients experienced checkout or asset fetching timeouts, generating significant chargebacks.
* **Public Trust & Legal Liability**: High exposure. Unmitigated system downtime resulted in SLA breach penalties, with legal counsel flagging liability risks.`;
                }

                const fallbackReport = `# OPERATIONAL AUTOPSY: ${scenarioMeta.title} (${scenario.severity || 'SEV1'})
**Assessment Score:** ${finalScore}/100  
**Operational Status:** ${operationalStatus}  
**Operator Performance Profile:** ${toneEmoji} ${archetype}

---

## 1. Issue Explanation & Simplified Overview
A high-severity **${scenario.severity || 'SEV1'}** event degraded services in the **${scenarioMeta.service}** namespace.
* **Simplified Explanation**: ${scenarioMeta.desc} This outage resulted in request drop cascades, starving downstream microservices and ultimately locking client-facing ingress nodes.

---

## 2. Root Cause & Technical Mechanics
Based on the timeline telemetry records:
* **Root Cause**: ${scenarioMeta.rootCause}
* **Optimal Recovery Path**: ${scenarioMeta.optimalPath}

---

## 3. Real Incident Timeline
The following table details the actual chronological progression of the incident and operational responses:

| Timestamp | Event Log / Operation Dispatched |
| :--- | :--- |
| --:--:-- | Initial system connection sequence established. |
${timelineRows}

---

## 4. Operator Actions & Causality Mapping
Every technical decision directly affected cluster survival:
* **Archetype Summary**: ${archetypeDetails}
* **Action Causality Logs**:
${causalitySection}

---

## 5. Investigation Analysis
Evaluation of clues discovered versus telemetry indicators ignored:
${discoveryLogs}

---

## 6. Stakeholder & Business Impact
Operational outcomes directly impacted organizational metrics:
${stakeholderConsequences}

---

## 7. Strategic Remediation & Opportunities
* **Narrative Summary**: ${narrativeSummary}
* **Action Directive**: ${strategicRemediation}`;

                setPostmortem(fallbackReport);
            }
            setLoading(false);
        };
        fetchPostmortem();
    }, [scenario.id, actions, timeline, finalScore, currentRole, currentUsername]);

    // Split markdown by ## headings dynamically
    const parsePostmortem = (md) => {
        if (!md) return { intro: '', sections: [] };

        const parts = md.split(/(?=##\s+\d\.)/g);
        const intro = parts[0] || '';
        
        const sections = [];
        for (let i = 1; i < parts.length; i++) {
            const rawPart = parts[i].trim();
            if (!rawPart) continue;

            const lines = rawPart.split('\n');
            const titleLine = lines[0] || '';
            const title = titleLine.replace(/^##\s*\d\.\s*/, '').trim();
            const content = lines.slice(1).join('\n').trim();

            sections.push({
                index: i,
                fullTitle: titleLine.replace(/^##\s*/, '').trim(),
                title: title,
                content: content
            });
        }
        return { intro, sections };
    };

    const { intro, sections } = parsePostmortem(postmortem);

    // Filter out raw text headers from the intro text
    const cleanIntro = (intro || '')
        .split('\n')
        .filter(line => {
            const l = line.trim();
            return !(
                l.startsWith('#') ||
                l.startsWith('**Severity:**') ||
                l.startsWith('**Outcome:**') ||
                l.startsWith('**Performance Rating:**') ||
                l.startsWith('**Assessment Score:**') ||
                l.startsWith('**Operational Status:**') ||
                l.startsWith('**Operator Performance Profile:**') ||
                l.startsWith('---')
            );
        })
        .join('\n')
        .trim();

    // Progress metric calculations
    const totalReviews = sections.length + 1; // sections + cover page
    const reviewedCount = Object.keys(reviewedSections).length;
    const reviewPercentage = Math.round((reviewedCount / totalReviews) * 100);

    const severityLevel = scenario.severity || 'SEV1';
    const isPositiveOutcome = finalScore >= 50;

    // Auto-parse digestible metric chips in paragraphs
    const renderDigestibleText = (text) => {
        if (typeof text !== 'string') return text;
        const regex = /(\b\d+(?:\.\d+)?%|\b\d+\/\d+|\b\d+\s*(?:s|ms|seconds|minutes|replicated|replicas|errors|connections|threads|rows|KB|MB|GB)\b|\bSEV\d\b|'[^']+'|`[^`]+`|\bCrashLoopBackOff\b|\bs3-connector\b|\bpostgres-db\b|\bpg-pool\b)/gi;
        const parts = text.split(regex);
        if (parts.length === 1) return text;
        
        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <span key={index} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-slate-900/60 border border-slate-800 text-purple-300 font-mono text-[10px] select-all shadow-sm">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 flex flex-col h-full bg-ops-bg text-slate-300 font-mono select-text relative">
            {/* Exit Option at Top Right of Reports */}
            <div className="absolute top-4 right-4 z-50 select-none">
                <button
                    onClick={() => {
                        const targetRole = currentRole === 'pr' || currentRole === 'comms' 
                            ? 'comms' 
                            : (currentRole === 'cyber' || currentRole === 'security' || currentRole === 'cybersecurity' ? 'security' : 'oncall');
                        navigate('/scenarios', { state: { role: targetRole } });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-500 bg-red-950/30 text-[10px] text-red-400 hover:bg-red-650 hover:text-white transition-all font-mono font-bold uppercase cursor-pointer"
                >
                    Exit to Menu
                </button>
            </div>

            {/* Ambient observibility particles */}
            <AmbientParticles color={roleAccentColor} />

            <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-6xl w-full m-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10"
            >
                {/* Left Column Layout Block: Metrics Summary & Interactive Replay Thread */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-ops-desk border border-ops-border rounded-xl p-6 shadow-panel">
                        <div className="flex items-center gap-3 mb-6 border-b border-ops-border pb-4">
                            <Award className="text-slate-455" style={{ color: roleAccentColor }} size={22} />
                            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Incident Workspace</h2>
                        </div>

                        <div className="space-y-5 mb-6">
                            <div>
                                <div className="text-slate-500 text-[10px] tracking-wider uppercase">Operational Performance Profile</div>
                                <div className="text-3xl font-black mt-1 text-slate-100 tracking-tight">{finalScore} <span className="text-xs font-normal text-slate-500">/ 100</span></div>

                                <div className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">
                                    {finalScore >= 80 && 'Strong operational execution with optimized mitigation latency and minimal system degeneration.'}
                                    {finalScore >= 50 && finalScore < 80 && 'Incident stabilized successfully. Impact footprint moderated by mid-tier troubleshooting timelines.'}
                                    {finalScore < 50 && 'Degraded triage progression increased platform downstream resource blast radius. Review recovery playbooks.'}
                                </div>
                            </div>

                            {/* Dynamic Grid insertion for core operational tracking parameters */}
                            <div className="border-t border-ops-border pt-4">
                                <div className="text-slate-500 text-[10px] tracking-wider uppercase mb-3">Incident Classification</div>
                                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                                    <div className="border border-ops-border bg-black/10 rounded p-2 flex flex-col justify-between">
                                        <div className="text-slate-500 mb-0.5">Severity</div>
                                        <div className="text-ops-red font-bold uppercase select-none animate-pulse">{scenario.severity || 'SEV1'}</div>
                                    </div>
                                    <div className="border border-ops-border bg-black/10 rounded p-2 flex flex-col justify-between">
                                        <div className="text-slate-500 mb-0.5">Affected Target</div>
                                        <div className="text-slate-200 truncate font-bold uppercase">{scenario.service || 'production'}</div>
                                    </div>
                                    <div className="border border-ops-border bg-black/10 rounded p-2 flex flex-col justify-between">
                                        <div className="text-slate-500 mb-0.5">Telemetry Marks</div>
                                        <div className="text-slate-200 font-bold">{timeline.length} logs</div>
                                    </div>
                                    <div className="border border-ops-border bg-black/10 rounded p-2 flex flex-col justify-between">
                                        <div className="text-slate-500 mb-0.5">Actions Logged</div>
                                        <div className="text-slate-200 font-bold">{actions.length} hooks</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRestart}
                            className="w-full bg-ops-terminal hover:bg-white/[0.04] border border-ops-border hover:border-slate-650 text-slate-200 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs tracking-wide border-slate-700 font-mono"
                        >
                            <RefreshCw size={12} /> RETURN TO INCIDENT ARCHIVE
                        </button>
                    </div>

                    {/* Timeline Replay Track Panel Module */}
                    <div className="bg-ops-desk border border-ops-border rounded-xl p-6 shadow-panel flex flex-col max-h-[420px]">
                        <div className="border border-ops-border rounded-lg p-3 bg-black/30 mb-4 select-none">
                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">System State Profile</div>
                            <div className="flex items-center gap-2 text-ops-green text-xs font-medium font-sans">
                                <CheckCircle size={14} className="shrink-0" />
                                Incident stabilized and all systems completely recovered.
                            </div>
                        </div>

                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 shrink-0">
                            <Clock size={12} /> Timeline Replication Track
                        </h3>

                        <div className="flex-1 overflow-y-auto pr-1 scrollbar-ops space-y-3 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-800">
                            {timeline.length === 0 ? (
                                <div className="text-slate-600 text-xs italic pl-6 font-sans">No pipeline metrics logged.</div>
                            ) : (
                                timeline.map((event, i) => (
                                    <div key={i} className="relative flex items-start pl-6 group">
                                        {/* Concentric node indicator markers */}
                                        <div className="absolute left-1 top-1 w-2 h-2 rounded-full border border-slate-600 bg-[#0a0f14] group-hover:border-ops-glow transition-colors z-10 -translate-x-1/4" />
                                        <div className="w-full bg-ops-terminal/30 border border-ops-border/60 p-2.5 rounded-lg shadow-sm group-hover:border-slate-700 transition-colors">
                                            <div className="font-mono text-[9px] text-slate-500 mb-0.5">{event.time}</div>
                                            <div className="text-xs text-slate-300 font-sans leading-relaxed break-all">{event.text}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column Layout Block: Comprehensive AI Incident Postmortem Audit Document */}
                <div className="lg:col-span-2 flex flex-col">
                    {/* Stepper Navigation Progress tracker */}
                    <div className="mb-6 border border-ops-border/60 bg-black/25 rounded-xl p-4 select-none relative overflow-hidden shadow-panel">
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-bold mb-3.5 flex justify-between items-center">
                            <span>Incident Investigation Stepper</span>
                            <span className={`${roleText} font-extrabold animate-pulse`}>REVIEWS COMPLETED: {reviewPercentage}%</span>
                        </div>
                        
                        <div className="relative flex justify-between items-center px-4 py-2">
                            {/* Horizontal continuous timeline connection line */}
                            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-[2.5px] bg-slate-800 z-0">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(activeSection / (sections.length || 7)) * 100}%` }}
                                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
                                />
                            </div>
                            
                            {/* Cover Summary Node */}
                            <button
                                onClick={() => setActiveSection(0)}
                                className={`relative z-10 h-7 px-2.5 rounded-lg border flex items-center justify-center text-[9px] font-mono font-extrabold transition-all duration-300 cursor-pointer ${
                                    activeSection === 0 
                                        ? `bg-purple-950/40 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]` 
                                        : reviewedSections[0] 
                                            ? 'bg-slate-900 border-slate-750 text-slate-400' 
                                            : 'bg-slate-950 border-slate-850 text-slate-650'
                                }`}
                            >
                                BRIEF
                            </button>

                            {/* Section Stepper Nodes */}
                            {Array.from({ length: sections.length || 7 }).map((_, idx) => {
                                const num = idx + 1;
                                const isCurrent = activeSection === num;
                                const isReviewed = reviewedSections[num];
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveSection(num)}
                                        className={`relative z-10 h-7 w-7 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 cursor-pointer ${
                                            isCurrent 
                                                ? `bg-purple-950/40 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]` 
                                                : isReviewed 
                                                    ? 'bg-slate-900 border-slate-750 text-slate-450' 
                                                    : 'bg-slate-950 border-slate-850 text-slate-650'
                                        }`}
                                    >
                                        {isReviewed && !isCurrent ? '✓' : num}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-ops-desk border border-ops-border rounded-xl p-8 shadow-panel flex flex-col h-auto min-h-[300px] justify-between relative overflow-hidden">
                        {/* Decorative vibrant glowing top accent bar */}
                        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-90 z-20" />
                        
                        {/* Decorative background grid hum */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(139,92,246,0.012)_1px,transparent_1px)] bg-[size:100%_6px] pointer-events-none" />
                        
                        <div className="relative z-10 flex-1 flex flex-col">
                            {/* Card Header with tabs */}
                            <div className="flex justify-between items-center border-b border-ops-border pb-4 mb-4 select-none">
                                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 tracking-tight">
                                    <FileText className="animate-pulse shrink-0" style={{ color: roleAccentColor }} size={18} />
                                    <span className="font-mono uppercase tracking-wider text-xs">Incident Autopsy Report</span>
                                </h3>
                                <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wider ${roleBadge}`}>
                                    {activeSection === 0 ? "Cover Summary" : `Section ${activeSection} of ${sections.length}`}
                                </span>
                            </div>

                            {/* Scrollable Content Bezel */}
                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-ops font-sans leading-relaxed min-h-[180px]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-mono">
                                        <div className="text-xs tracking-widest uppercase animate-pulse mb-2 text-purple-400">
                                            PARSING TELEMETRY BUFFERS...
                                        </div>
                                        <p className="text-[10px] text-slate-650">Reconstructing timeline state arrays and evaluating root cause analyses.</p>
                                    </div>
                                ) : (
                                    <motion.div
                                        key={activeSection}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-slate-300 font-sans text-sm leading-relaxed space-y-4 max-w-none select-text"
                                    >
                                        {activeSection === 0 ? (
                                            <div className="space-y-6">
                                                {/* Executive Brief Card */}
                                                <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-purple-500/40 group-hover:bg-purple-500 transition-colors duration-300" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base select-none mr-1">📋</span>
                                                        <div>
                                                            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">Executive Brief</div>
                                                            <div className="text-[8px] text-slate-500 uppercase tracking-widest font-mono select-none">Official Incident Retrospective Audit</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[11px] leading-relaxed text-slate-355 font-sans mt-3 ml-7">
                                                        This automated incident retrospective compiles telemetry data, timeline sequences, and operator decisions to evaluate cluster survival, blast radius, and strategic remediation path efficiency.
                                                    </div>
                                                </div>

                                                {/* Grid for Score and Status */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Assessment Score Card */}
                                                    <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500/40 group-hover:bg-amber-500 transition-colors duration-300" />
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base select-none mr-1">🏆</span>
                                                            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">Assessment Score</div>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ml-2 ${
                                                                finalScore >= 80 
                                                                    ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                    : finalScore >= 50
                                                                        ? 'bg-blue-950/40 text-blue-400 border-blue-900/30'
                                                                        : 'bg-red-950/40 text-red-400 border-red-900/30 animate-pulse'
                                                            }`}>
                                                                {finalScore >= 80 ? 'Elite' : finalScore >= 50 ? 'Satisfactory' : 'Needs Imp.'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 ml-7 space-y-1">
                                                            <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                                                                <span>{finalScore}</span>
                                                                <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                                                            </div>
                                                            <div className="text-[11px] leading-relaxed text-slate-355 font-sans">
                                                                Overall rating of SRE command efficiency, diagnostic accuracy, and response latency.
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mitigation Status Card */}
                                                    <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group">
                                                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                                                            finalScore >= 50 
                                                                ? 'bg-green-500/40 group-hover:bg-green-500' 
                                                                : 'bg-red-500/40 group-hover:bg-red-500'
                                                        } transition-colors duration-300`} />
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base select-none mr-1">🛡️</span>
                                                            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">Mitigation Status</div>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ml-2 ${
                                                                finalScore >= 50 
                                                                    ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                    : 'bg-red-950/40 text-red-400 border-red-900/30'
                                                            }`}>
                                                                {finalScore >= 50 ? 'Stabilized' : 'Degraded'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 ml-7 space-y-1.5">
                                                            <div className={`text-[10px] font-bold font-mono uppercase tracking-wide px-2 py-0.5 rounded-md w-fit ${
                                                                finalScore >= 50 
                                                                    ? 'bg-green-950/50 text-green-400 border border-green-900/30' 
                                                                    : 'bg-red-950/50 text-red-400 border border-red-900/30'
                                                            }`}>
                                                                {operationalStatus.split(' / ')[0]}
                                                            </div>
                                                            <div className="text-[11px] leading-relaxed text-slate-355 font-sans">
                                                                Incident operational classification and recovery outcomes assessed within service margins.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Operator Profile Card */}
                                                <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors duration-300" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base select-none mr-1">💻</span>
                                                        <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">Operator Profile</div>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ml-2 bg-indigo-950/40 text-indigo-400 border-indigo-900/30">
                                                            {toneEmoji.split(' ')[1] || 'SRE'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 ml-7 space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base select-none">{toneEmoji.split(' ')[0]}</span>
                                                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wide font-mono">
                                                                {archetype}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] leading-relaxed text-slate-355 font-sans">
                                                            {archetypeDetails}
                                                        </p>
                                                    </div>
                                                </div>

                                                {cleanIntro && (
                                                    <div className="border-t border-ops-border pt-4">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                li: ({ node, ...props }) => {
                                                                    const childrenArray = React.Children.toArray(props.children);
                                                                    const { isCard, keyText, descContent } = extractCardData(childrenArray);
                                                                    
                                                                    if (isCard) {
                                                                        const graphic = getGraphicsForKey(keyText);
                                                                        return (
                                                                            <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group mb-4">
                                                                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-purple-500/40 group-hover:bg-purple-500 transition-colors duration-300" />
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-base select-none mr-1">{graphic}</span>
                                                                                    <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">{keyText}</div>
                                                                                </div>
                                                                                <div className="text-[11px] leading-relaxed text-slate-350 font-sans mt-2 ml-7">
                                                                                    {descContent}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return <li className="ml-4 list-disc text-slate-355 mb-2 font-sans leading-relaxed text-xs" {...props} />;
                                                                },
                                                                ul: ({ node, ...props }) => {
                                                                    const childrenArray = React.Children.toArray(props.children);
                                                                    const isCardList = childrenArray.some(c => {
                                                                        const grandChildren = React.Children.toArray(c?.props?.children);
                                                                        const { isCard } = extractCardData(grandChildren);
                                                                        return isCard;
                                                                    });
                                                                    
                                                                    if (isCardList) {
                                                                        return <div className="space-y-4 my-5" {...props} />;
                                                                    }
                                                                    return <ul className="my-4 space-y-2 pl-5 list-disc" {...props} />;
                                                                },
                                                                p: ({ node, ...props }) => <p className="text-xs text-slate-400 font-sans leading-relaxed my-2" {...props} />,
                                                                strong: ({ node, ...props }) => <strong className="text-slate-100 font-semibold" {...props} />,
                                                                code: ({ node, inline, ...props }) => (
                                                                    <code className="px-1.5 py-0.5 rounded bg-black/40 border border-slate-800/60 font-mono text-[10px] text-purple-300" {...props} />
                                                                )
                                                            }}
                                                        >
                                                            {cleanIntro}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <h4 className="text-xs font-extrabold text-slate-100 font-mono uppercase tracking-widest border-b border-slate-800/40 pb-2 mb-4">
                                                    {sections[activeSection - 1]?.fullTitle || sections[activeSection - 1]?.title}
                                                </h4>

                                                {/* SECTION 1 CUSTOM VISUALIZATION: Observable microservice architecture */}
                                                {activeSection === 1 && (
                                                    <ServiceGraph 
                                                        isPositive={isPositiveOutcome} 
                                                        serviceName={scenario.service || 's3-connector'} 
                                                        color={roleAccentColor}
                                                    />
                                                )}

                                                {/* SECTION 2 CUSTOM VISUALIZATION: Root Cause spotlight causality tool */}
                                                {activeSection === 2 && (
                                                    <RootCauseSpotlight 
                                                        content={sections[activeSection - 1]?.content.split('* **Optimal Recovery Path**:')[0].replace(/^\*\s*\*\*Root Cause\*\*:\s*/, '')}
                                                        optimalPath={sections[activeSection - 1]?.content.split('* **Optimal Recovery Path**:')[1]}
                                                        isPositive={isPositiveOutcome}
                                                        color={roleAccentColor}
                                                        roleText={roleText}
                                                    />
                                                )}

                                                {/* SECTION 3 CUSTOM VISUALIZATION: Observibility incident timeline milestone track */}
                                                {activeSection === 3 && (
                                                    <div className="text-[10px] text-slate-500 font-mono italic p-4 text-center border border-dashed border-slate-850 rounded-xl select-none">
                                                        Refer to the detailed Chronological Incident Timeline table below.
                                                    </div>
                                                )}

                                                {/* SECTION 4 CUSTOM VISUALIZATION: SRE dynamic operator profiles and command cards */}
                                                {activeSection === 4 && (
                                                    <OperatorActionsJourney 
                                                        actions={actions}
                                                        finalScore={finalScore}
                                                        archetype={archetype}
                                                        archetypeDetails={archetypeDetails}
                                                        color={roleAccentColor}
                                                        roleBadge={roleBadge}
                                                    />
                                                )}

                                                {/* SECTION 5 CUSTOM VISUALIZATION: Observibility discovery clue carousel */}
                                                {activeSection === 5 && (
                                                    <FindingsCarousel 
                                                        discoveries={incidentState.discoveries}
                                                    />
                                                )}

                                                {/* SECTION 7 CUSTOM VISUALIZATION: Strategic lessons-learned sticky recommendation cards */}
                                                {activeSection === 7 && (
                                                    <StrategicRemediationBoard 
                                                        recommendations={null} 
                                                        color={roleAccentColor}
                                                    />
                                                )}

                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        table: ({ node, ...props }) => (
                                                            <div className="overflow-x-auto my-5 rounded-xl border border-slate-850 bg-[#070b0f]/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                                                                <table className="min-w-full divide-y divide-slate-800/60 text-left text-xs font-mono" {...props} />
                                                            </div>
                                                        ),
                                                        thead: ({ node, ...props }) => (
                                                            <thead className="bg-[#0b1016]" {...props} />
                                                        ),
                                                        tbody: ({ node, ...props }) => (
                                                            <tbody className="divide-y divide-slate-900/40 bg-black/10" {...props} />
                                                        ),
                                                        th: ({ node, ...props }) => (
                                                            <th className="px-4 py-3 font-mono font-bold uppercase tracking-wider text-[9px] text-slate-455 border-b border-slate-850 first:text-purple-400 first:font-extrabold" {...props} />
                                                        ),
                                                        td: ({ node, ...props }) => {
                                                            const text = String(
                                                                React.Children.toArray(props.children)
                                                                    .map(c => {
                                                                        if (typeof c === 'string' || typeof c === 'number') return c;
                                                                        if (c?.props?.children) {
                                                                            return Array.isArray(c.props.children) 
                                                                                ? c.props.children.join('') 
                                                                                : String(c.props.children);
                                                                        }
                                                                        return '';
                                                                    })
                                                                    .join('')
                                                            ).trim();
                                                            
                                                            const isRecommended = typeof text === 'string' && (text.includes('✅') || text.toLowerCase().includes('correct') || text.toLowerCase().includes('recommended'));
                                                            const isCritical = typeof text === 'string' && (text.includes('🎯') || text.toLowerCase().includes('critical'));
                                                            const isRisky = typeof text === 'string' && (text.includes('❌') || text.toLowerCase().includes('wrong') || text.toLowerCase().includes('risky'));
                                                            const isDelayed = typeof text === 'string' && (text.includes('⚠️') || text.toLowerCase().includes('prereq') || text.toLowerCase().includes('missing') || text.toLowerCase().includes('delayed'));
                                                            const isObservational = typeof text === 'string' && (text.includes('➡️') || text.toLowerCase().includes('observational') || text.toLowerCase().includes('neutral'));
                                                            
                                                            if (isRecommended) {
                                                                return (
                                                                    <td className="px-4 py-3 text-left border-t border-slate-900/30">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-950/40 text-green-400 border border-green-900/20 font-mono text-[9px] font-bold uppercase tracking-wider">
                                                                            {props.children}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            }
                                                            if (isCritical) {
                                                                return (
                                                                    <td className="px-4 py-3 text-left border-t border-slate-900/30">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-400 border border-purple-900/30 font-mono text-[9px] font-bold animate-pulse uppercase tracking-wider">
                                                                            {props.children}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            }
                                                            if (isRisky) {
                                                                return (
                                                                    <td className="px-4 py-3 text-left border-t border-slate-900/30">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-950/40 text-red-400 border border-red-900/20 font-mono text-[9px] font-bold uppercase tracking-wider">
                                                                            {props.children}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            }
                                                            if (isDelayed) {
                                                                return (
                                                                    <td className="px-4 py-3 text-left border-t border-slate-900/30">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-yellow-950/40 text-yellow-400 border border-yellow-900/20 font-mono text-[9px] font-bold uppercase tracking-wider">
                                                                            {props.children}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            }
                                                            if (isObservational) {
                                                                return (
                                                                    <td className="px-4 py-3 text-left border-t border-slate-900/30">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/40 text-blue-400 border border-blue-900/35 font-mono text-[9px] font-bold uppercase tracking-wider">
                                                                            {props.children}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            }
                                                            
                                                            return (
                                                                <td className="px-4 py-3.5 text-slate-300 font-sans text-xs leading-relaxed border-t border-slate-900/30 first:text-purple-400 first:font-mono first:font-semibold first:tracking-wider" {...props} />
                                                            );
                                                        },
                                                        tr: ({ node, ...props }) => (
                                                            <tr className="hover:bg-purple-950/10 transition-colors duration-150 odd:bg-[#070b0e]/30" {...props} />
                                                        ),
                                                        h1: ({ node, ...props }) => <h1 className="text-base font-extrabold tracking-tight text-white mb-3 border-b border-slate-800 pb-1.5 font-mono uppercase" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-sm font-bold tracking-tight text-purple-400 mb-2 font-mono mt-4 uppercase" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-xs font-semibold tracking-tight text-slate-200 mb-1.5 font-mono mt-3 uppercase" {...props} />,
                                                        li: ({ node, ...props }) => {
                                                              const childrenArray = React.Children.toArray(props.children);
                                                              const { isCard, keyText, descContent } = extractCardData(childrenArray);
                                                              
                                                              if (isCard) {
                                                                  const graphic = getGraphicsForKey(keyText);
                                                                  const keyLower = keyText.toLowerCase();
                                                                  const isStakeholder = keyLower.includes('manager trust') || 
                                                                      keyLower.includes('executive confidence') || 
                                                                      keyLower.includes('customer impact') || 
                                                                      keyLower.includes('public trust');
                                                                  
                                                                  let statusBadge = null;
                                                                  if (isStakeholder) {
                                                                      const isPositive = finalScore >= 50;
                                                                      let statusText = '';
                                                                      let badgeStyles = '';
                                                                      
                                                                      if (keyLower.includes('manager trust')) {
                                                                          statusText = isPositive ? 'Stable / Intact' : 'Collapse';
                                                                          badgeStyles = isPositive 
                                                                              ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                              : 'bg-red-950/40 text-red-400 border-red-900/30';
                                                                      } else if (keyLower.includes('executive confidence')) {
                                                                          statusText = isPositive ? 'Maintained' : 'Destroyed';
                                                                          badgeStyles = isPositive 
                                                                              ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                              : 'bg-red-950/40 text-red-400 border-red-900/30';
                                                                      } else if (keyLower.includes('customer impact')) {
                                                                          statusText = isPositive ? 'Minimal' : 'High Impact';
                                                                          badgeStyles = isPositive 
                                                                              ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                              : 'bg-red-950/40 text-red-400 border-red-900/30 animate-pulse';
                                                                      } else if (keyLower.includes('public trust')) {
                                                                          statusText = isPositive ? 'Zero Exposure' : 'High Liability';
                                                                          badgeStyles = isPositive 
                                                                              ? 'bg-green-950/40 text-green-400 border-green-900/30' 
                                                                              : 'bg-red-950/40 text-red-400 border-red-900/30';
                                                                      }
                                                                      
                                                                      statusBadge = (
                                                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ml-2 ${badgeStyles}`}>
                                                                              {statusText}
                                                                          </span>
                                                                      );
                                                                  }
                                                                  
                                                                  return (
                                                                      <div className="border border-ops-border/75 bg-[#070b10]/60 hover:bg-[#0b1016]/80 hover:border-purple-500/30 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all duration-300 relative overflow-hidden group mb-4">
                                                                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-purple-500/40 group-hover:bg-purple-500 transition-colors duration-300" />
                                                                          
                                                                          <div className="flex items-center gap-2">
                                                                              <span className="text-base select-none mr-1">{graphic}</span>
                                                                              <div className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold select-none">{keyText}</div>
                                                                              {statusBadge}
                                                                          </div>
                                                                          <div className="text-[11px] leading-relaxed text-slate-355 font-sans mt-2 ml-7 font-semibold">
                                                                              {descContent}
                                                                          </div>
                                                                      </div>
                                                                  );
                                                              }
                                                              return <li className="ml-4 list-disc text-slate-350 mb-2 font-sans leading-relaxed text-xs" {...props} />;
                                                         },
                                                         ul: ({ node, ...props }) => {
                                                             const childrenArray = React.Children.toArray(props.children);
                                                             const isCardList = childrenArray.some(c => {
                                                                 const grandChildren = React.Children.toArray(c?.props?.children);
                                                                 const { isCard } = extractCardData(grandChildren);
                                                                 return isCard;
                                                             });
                                                             
                                                             if (isCardList) {
                                                                 if (activeSection === 6) {
                                                                     return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5" {...props} />;
                                                                 }
                                                                 return <div className="space-y-4 my-5" {...props} />;
                                                             }
                                                             return <ul className="my-4 space-y-2 pl-5 list-disc" {...props} />;
                                                         },
                                                        p: ({ node, ...props }) => {
                                                            const text = React.Children.toArray(props.children).join('');
                                                            const hasKeyTerms = text.includes('Root Cause:') || text.includes('Optimal Recovery Path:') || text.includes('Assessment Score:');
                                                            if (hasKeyTerms) {
                                                                return null; // Suppress duplicate metadata indicators rendered by custom spotlight cards
                                                            }
                                                            return (
                                                                <p className="text-xs text-slate-400 font-sans leading-relaxed my-2.5">
                                                                    {React.Children.map(props.children, child => renderDigestibleText(child))}
                                                                </p>
                                                            );
                                                        },
                                                        strong: ({ node, ...props }) => <strong className="text-slate-100 font-extrabold" {...props} />,
                                                        code: ({ node, inline, ...props }) => (
                                                            <code className="px-1.5 py-0.5 rounded bg-black/40 border border-slate-800/60 font-mono text-[10px] text-purple-300" {...props} />
                                                        )
                                                    }}
                                                >
                                                    {sections[activeSection - 1]?.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Card Pagination Bezel Controls */}
                        {!loading && sections.length > 0 && (
                          <div className="mt-6 flex justify-between items-center relative z-10 border-t border-ops-border pt-4 select-none">
                            {/* Dot indices selector */}
                            <div className="flex flex-wrap gap-1.5 max-w-[60%]">
                              <button
                                onClick={() => setActiveSection(0)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${activeSection === 0 ? 'w-4 bg-purple-500' : 'w-1.5 bg-slate-800 hover:bg-slate-650'}`}
                                title="Executive Summary"
                              />
                              {sections.map((sec, i) => (
                                <button
                                  key={sec.index}
                                  onClick={() => setActiveSection(sec.index)}
                                  className={`h-1.5 rounded-full transition-all duration-300 ${activeSection === sec.index ? 'w-4 bg-purple-500' : 'w-1.5 bg-slate-800 hover:bg-slate-650'}`}
                                  title={sec.title}
                                />
                              ))}
                            </div>

                            {/* Prev/Next buttons */}
                            <div className="flex items-center gap-2 font-mono text-[10px]">
                              {activeSection > 0 && (
                                <button
                                  onClick={() => setActiveSection(c => c - 1)}
                                  className="px-3 py-1.5 rounded border border-slate-800 hover:border-slate-650 hover:bg-slate-900/50 text-slate-400 transition-colors font-bold cursor-pointer"
                                >
                                  &larr; PREV SECTION
                                </button>
                              )}
                              {activeSection < sections.length ? (
                                <button
                                  onClick={() => setActiveSection(c => c + 1)}
                                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer"
                                >
                                  NEXT SECTION &rarr;
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-4 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-650 font-bold"
                                >
                                  REPORT ENDED
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ScoreScreen;