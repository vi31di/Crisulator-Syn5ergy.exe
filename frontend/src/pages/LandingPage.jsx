import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Server, 
  ShieldAlert, 
  Megaphone, 
  Terminal as TermIcon, 
  Activity, 
  Globe, 
  Cpu, 
  ArrowRight, 
  ExternalLink,
  Lock,
  Layers,
  CheckCircle,
  Award,
  Zap,
  Play,
  Flame,
  User,
  Star
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard.jsx';

const features = [
  { 
    title: 'Dynamic Adaptation Matrix', 
    desc: '15 real-world inspired incidents spanning On-Call Engineering, Cyber Security, and Crisis Comms profiles. The simulation engine dynamically mutates outcomes based on active system changes.', 
    n: '01',
    icon: <Layers size={18} className="text-cyan-400" />
  },
  { 
    title: 'Multi-Agent Consensus Bridges', 
    desc: 'Manager, Teammate, Client, Tech Lead, and SME response personas simulate enterprise pressure using context-aware communication flows.', 
    n: '02',
    icon: <Globe size={18} className="text-purple-400" />
  },
  { 
    title: 'Global Telemetry Memory', 
    desc: 'Core platform variables—error rate, P95 response latency, thread pools, and CPU exhaustion levels—propagate consequences directly from user operational inputs.', 
    n: '03',
    icon: <Activity size={18} className="text-emerald-400" />
  },
  { 
    title: 'Deterministic Command Validation', 
    desc: 'Remediation scripts are parsed dynamically through a multi-tier verification loop to ensure safe state transitions before committing fixes.', 
    n: '04',
    icon: <TermIcon size={18} className="text-amber-400" />
  },
  { 
    title: 'Cascading Degradation Vectors', 
    desc: 'Priority incident environments spanning critical threat levels feature cumulative infrastructure damage and performance scaling coefficients.', 
    n: '05',
    icon: <ShieldAlert size={18} className="text-red-400" />
  },
  { 
    title: 'Structured Postmortem Debriefs', 
    desc: 'Generates immutable timeline logs, root cause analysis files, and performance metrics reports mapping out clear areas for team improvement.', 
    n: '06',
    icon: <CheckCircle size={18} className="text-blue-400" />
  },
];

export default function LandingPage() {

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#03060a] pb-24 pt-20 px-4 font-sans select-none text-slate-200">
      
      {/* Decorative grid system */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Fixed Chic Navbar */}
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
            <Link to="/roles" className="text-xs font-mono text-slate-400 hover:text-cyan-400 tracking-wider transition-colors uppercase">
              Operational Roles
            </Link>
            <Link to="/scenarios" className="text-xs font-mono text-slate-400 hover:text-cyan-400 tracking-wider transition-colors uppercase">
              Incident Archive
            </Link>
            <a href="#leaderboard" className="text-xs font-mono text-slate-400 hover:text-cyan-400 tracking-wider transition-colors uppercase">
              Leaderboards
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              to="/login"
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/40 text-[10px] font-mono text-slate-300 hover:text-white tracking-widest uppercase transition-all cursor-pointer"
            >
              Enter Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center pt-8 sm:pt-14">
        
        {/* Centered Hero Heading */}
        <div className="flex flex-col items-center text-center max-w-3xl mb-12 sm:mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3.5 py-1 text-[10px] text-cyan-400 uppercase font-mono tracking-widest mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            AI-Native Incident Triage Platform
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-sans font-black text-4xl sm:text-6xl text-slate-50 tracking-tight leading-none"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Crisulator</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-sans text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl mt-4"
          >
            Train inside high-stakes operational crises inspired by real-world infrastructure failures. 
            Thwack production bottlenecks, lock down security breaches, and coordinate crisis communications under heavy enterprise pressure.
          </motion.p>
        </div>

        {/* CTA Wide Button Grid (sregym.com style) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mb-20 px-2"
        >
          <Link 
            to="/login"
            className="font-mono py-4 text-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] inline-flex items-center gap-2 cursor-pointer"
          >
            <Play size={14} fill="currentColor" /> Enter Operations Center
          </Link>
          <Link 
            to="/scenarios"
            className="font-mono py-4 text-center justify-center rounded-lg border border-slate-800 bg-[#090e15] hover:bg-slate-900 text-slate-200 hover:text-white font-extrabold text-sm uppercase tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Award size={14} /> View Incident Archive
          </Link>
        </motion.div>

        {/* Double-Table Leaderboard / Benchmark Section (sregym.com style) */}
        <div id="leaderboard" className="w-full max-w-5xl mx-auto mb-20 select-none">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-2">Platform Leaderboard</span>
            <h2 className="font-sans text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-tight">Top Operator Performance</h2>
            <p className="font-mono text-[10px] text-slate-500 mt-1">Live scores recorded across SWE, Cybersecurity, and Crisis Comms domains</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-2">
            
            {/* Table 1: Technical & SRE */}
            <div className="bg-[#05080c] border border-slate-900 rounded-xl overflow-hidden shadow-panel">
              <div className="border-b border-slate-900 px-4 py-3 bg-[#080c12]/60 flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">[SRE & Cybersecurity Triage]</span>
                <span className="font-mono text-[8px] text-cyan-400 uppercase bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/10">Active System</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono text-[10px] text-slate-300">
                  <thead className="bg-[#070b10] text-[9px] text-slate-500 border-b border-slate-900">
                    <tr>
                      <th className="py-2.5 px-4 text-center w-12">Rank</th>
                      <th className="py-2.5 px-2">Operator Name</th>
                      <th className="py-2.5 px-2">Scenario Role</th>
                      <th className="py-2.5 px-4 text-right w-16">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-amber-500">1</td>
                      <td className="py-3 px-2 font-sans font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" /> Claude 3.5 Code
                      </td>
                      <td className="py-3 px-2 text-slate-400">payments-api (SRE)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">98/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">2</td>
                      <td className="py-3 px-2 font-sans text-slate-300">Lead SRE Engineer</td>
                      <td className="py-3 px-2 text-slate-400">us-east-1 (SRE)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">94/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-amber-600">3</td>
                      <td className="py-3 px-2 font-sans text-slate-350">Stratus Agent</td>
                      <td className="py-3 px-2 text-slate-400">facebook-dns (SRE)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">92/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-600">4</td>
                      <td className="py-3 px-2 font-sans text-slate-400">Senior Staff Dev</td>
                      <td className="py-3 px-2 text-slate-400">cloudflare-leak (Sec)</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-300">88/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Crisis Communications */}
            <div className="bg-[#05080c] border border-slate-900 rounded-xl overflow-hidden shadow-panel">
              <div className="border-b border-slate-900 px-4 py-3 bg-[#080c12]/60 flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">[Crisis Communications & PR]</span>
                <span className="font-mono text-[8px] text-purple-400 uppercase bg-purple-950/30 px-2 py-0.5 rounded border border-purple-500/10">Active System</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left font-mono text-[10px] text-slate-300">
                  <thead className="bg-[#070b10] text-[9px] text-slate-500 border-b border-slate-900">
                    <tr>
                      <th className="py-2.5 px-4 text-center w-12">Rank</th>
                      <th className="py-2.5 px-2">Operator Name</th>
                      <th className="py-2.5 px-2">Scenario Role</th>
                      <th className="py-2.5 px-4 text-right w-16">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-950">
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-amber-500">1</td>
                      <td className="py-3 px-2 font-sans font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-500" /> Director of PR
                      </td>
                      <td className="py-3 px-2 text-slate-400">brand-rescue (PR)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">96/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">2</td>
                      <td className="py-3 px-2 font-sans text-slate-300">Claude 3.5 Code</td>
                      <td className="py-3 px-2 text-slate-400">knight-collapse (PR)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">95/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-amber-600">3</td>
                      <td className="py-3 px-2 font-sans text-slate-350">Comms VP Assistant</td>
                      <td className="py-3 px-2 text-slate-400">gitlab-outage (PR)</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">90/100</td>
                    </tr>
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-600">4</td>
                      <td className="py-3 px-2 font-sans text-slate-400">GPT-5 Agent</td>
                      <td className="py-3 px-2 text-slate-400">facebook-leak (PR)</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-300">86/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="w-full flex items-center justify-between border-b border-slate-900 pb-3 mb-10 select-none px-2">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest font-bold">Engine Architecture</span>
          <span className="text-[10px] text-slate-600 font-mono">06 CORE DYNAMIC PLATFORMS</span>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full mb-16 px-2"
        >
          {features.map((f, idx) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.04 * idx, duration: 0.4 }}
            >
              <GlassCard glow={idx % 2 === 0 ? 'cyan' : 'purple'} className="p-6 h-full backdrop-blur-sm border-slate-900 bg-slate-950/10 shadow-panel flex flex-col justify-between hover:border-slate-800 hover:bg-slate-950/30 hover:-translate-y-0.5 transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-slate-950 pb-2.5">
                    <div className="flex items-center gap-2">
                      {f.icon}
                      <span className="font-mono text-[9px] text-slate-650 tracking-wider">SYS_REF.{f.n}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 uppercase font-semibold">Active Subsystem</span>
                  </div>
                  <h3 className="font-sans font-bold text-sm text-slate-200 mb-2 group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                  <p className="font-sans text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Incident Priority Footnotes */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="w-full max-w-4xl px-2"
        >
          <div className="bg-[#05080c] rounded-2xl p-6 border border-slate-900 backdrop-blur-sm shadow-panel">
            <div className="font-mono text-[9px] tracking-[0.25em] text-slate-500 mb-4 text-center uppercase font-bold">
              Incident Severity & SLA Classifications
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {[
                { sev: 'SEV0', color: 'text-red-400 font-bold', time: '< 1 Hour', label: 'Platform Collapse' },
                { sev: 'SEV1', color: 'text-orange-400 font-bold', time: '< 4 Hours', label: 'Critical Gateway' },
                { sev: 'SEV2', color: 'text-yellow-400 font-bold', time: '< 24 Hours', label: 'Degraded State' },
                { sev: 'SEV3', color: 'text-blue-400', time: '< 48 Hours', label: 'Minor Outlier' },
                { sev: 'SEV4', color: 'text-slate-500', time: 'Telemetry', label: 'Periodic Auditing' },
              ].map(s => (
                <div key={s.sev} className="space-y-1 p-3 bg-black/10 rounded-xl border border-slate-900/50 hover:border-slate-800 transition-all select-none">
                  <div className={`font-mono text-xs ${s.color}`}>{s.sev}</div>
                  <div className="font-mono text-[9px] text-slate-500">{s.time}</div>
                  <div className="font-sans text-[10px] text-slate-400 tracking-tight truncate">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}