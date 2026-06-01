import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, ShieldAlert, Megaphone, ArrowRight, Zap, Terminal } from 'lucide-react';
import { GlassCard } from '../components/GlassCard.jsx';
import { ROLES } from '../data/scenarios.js';

function RoleCard({ role, onClick }) {
  // Setup role-specific color configurations
  const config = {
    oncall: {
      accent: 'cyan',
      glow: 'cyan',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
      badgeColor: 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400',
      btnHover: 'hover:bg-cyan-500 hover:text-black hover:border-cyan-400',
      bullets: ['Distributed Systems', 'Kubernetes Clusters', 'Prometheus Metrics', 'Rollback Triggers'],
      icon: <Server size={22} className="text-cyan-400 animate-pulse" />
    },
    security: {
      accent: 'red',
      glow: 'red',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/20',
      badgeColor: 'bg-red-950/20 border-red-500/20 text-red-400',
      btnHover: 'hover:bg-red-500 hover:text-black hover:border-red-400',
      bullets: ['Threat Isolation', 'Forensic Log Audits', 'PCAP Traffic Intrusion', 'IP Sandbox containment'],
      icon: <ShieldAlert size={22} className="text-red-400 animate-pulse" />
    },
    comms: {
      accent: 'purple',
      glow: 'purple',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      badgeColor: 'bg-purple-950/20 border-purple-500/20 text-purple-400',
      btnHover: 'hover:bg-purple-500 hover:text-black hover:border-purple-400',
      bullets: ['Stakeholder Alerts', 'Media Inquiries Response', 'Reuters Press Releases', 'Public Sentiment Trust'],
      icon: <Megaphone size={22} className="text-purple-400 animate-pulse" />
    }
  };

  const style = config[role.id] || config.oncall;

  return (
    <motion.div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className="cursor-pointer outline-none select-none h-full group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <GlassCard glow={style.glow} className={`h-full p-6 border-slate-900 bg-slate-950/10 shadow-panel flex flex-col justify-between min-h-[300px] hover:border-slate-800 hover:bg-slate-950/30 transition-all duration-300`}>
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-950 pb-3">
            <div className="h-9 w-9 rounded-lg border border-slate-900 bg-[#080d14] flex items-center justify-center shadow-panel group-hover:border-slate-700 transition-colors">
              {style.icon}
            </div>
            
            <div className={`font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border ${style.badgeColor}`}>
              Verified Access
            </div>
          </div>

          {/* Card Body */}
          <h3 className="font-sans font-bold text-base text-slate-100 mb-2 tracking-tight group-hover:text-white transition-colors">
            {role.title}
          </h3>
          <p className="font-sans text-xs leading-relaxed text-slate-400 mb-5">
            {role.subtitle}
          </p>
        </div>

        <div>
          {/* Accent-colored custom tags */}
          <div className="border-t border-slate-950 pt-4 mb-5 space-y-1.5">
            {style.bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
                <span className={`h-1 w-1 rounded-full ${role.id === 'oncall' ? 'bg-cyan-400' : role.id === 'security' ? 'bg-red-400' : 'bg-purple-400'}`} />
                <span>{b}</span>
              </div>
            ))}
          </div>

          {/* Incident Archive CTA Button */}
          <div className={`inline-flex items-center justify-between w-full border border-slate-850 hover:border-slate-700 bg-black/25 px-3.5 py-2 font-mono text-[9px] text-slate-350 hover:text-slate-100 rounded transition-all uppercase tracking-wider group-hover:border-slate-700`}>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${role.id === 'oncall' ? 'bg-cyan-500' : role.id === 'security' ? 'bg-red-500' : 'bg-purple-500'} animate-pulse`} />
              Select Workspace
            </span>
            <ArrowRight size={10} className="transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#03060a] pb-24 pt-20 px-4 font-sans select-none text-slate-200">
      
      {/* Decorative Grid Mesh */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Shared Chic Navbar */}
      <header className="fixed top-0 inset-x-0 h-14 border-b border-slate-900/80 bg-slate-950/70 backdrop-blur-md z-50 flex items-center select-none">
        <div className="max-w-6xl mx-auto w-full px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-6 w-6 rounded border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.1)] group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all">
              <Zap size={12} className="text-cyan-400 group-hover:text-cyan-300 transition-colors animate-pulse" />
            </div>
            <span className="font-mono text-sm font-black tracking-widest text-slate-100 uppercase bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent group-hover:text-white transition-colors">
              Crisulator
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/roles" className="text-xs font-mono text-cyan-400 tracking-wider transition-colors uppercase">
              Operational Roles
            </Link>
            <Link to="/scenarios" className="text-xs font-mono text-slate-400 hover:text-cyan-400 tracking-wider transition-colors uppercase">
              Incident Archive
            </Link>
            <Link to="/" className="text-xs font-mono text-slate-400 hover:text-cyan-400 tracking-wider transition-colors uppercase">
              Leaderboards
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/40 text-[10px] font-mono text-slate-350 hover:text-white tracking-widest uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              &larr; Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto max-w-5xl pt-8 sm:pt-14">
        
        {/* Centered Hero Status Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3.5 py-1 text-[10px] text-cyan-400 uppercase font-mono tracking-widest mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            Control segment profiling
          </div>

          <h2 className="font-sans font-black text-3xl sm:text-5xl text-slate-50 mb-4 tracking-tight">
            Select Your <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Operational Domain</span>
          </h2>
          
          <p className="font-sans text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
            Each workspace represents a distinct operational environment featuring specialized playbooks, targeted incident response metrics, and custom diagnostic telemetry setups.
          </p>
        </motion.div>

        {/* Roles Allocation Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 w-full px-2">
          {ROLES.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx, duration: 0.4 }}
            >
              <RoleCard role={r} onClick={() => navigate('/scenarios', { state: { role: r.id } })} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}