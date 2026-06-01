import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../data/api.js';

// Clean, realistic tone-mapped accent markers for production tracking indices
const SEV_STYLES = {
  SEV0: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: 'bg-red-500' },
  SEV1: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', bar: 'bg-orange-500' },
  SEV2: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', bar: 'bg-yellow-500' }
};

export default function ScenarioSelectorPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const role = state?.role || 'oncall';
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    api.getScenarios(role)
      .then((data) => {
        if (!data || data.length === 0) {
          setError(true);
        } else {
          setScenarios(data);
        }
      })
      .catch((err) => {
        console.error("Failed to connect to the telemetry archive registry:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [role]);

  const roleLabels = {
    oncall: 'On-Call SWE',
    security: 'Cybersecurity Analyst',
    cybersecurity: 'Cybersecurity Analyst',
    comms: 'PR / Comms Manager',
    pr: 'PR / Comms Manager'
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-transparent pb-20 pt-10 sm:pt-14 px-4 font-mono">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800/40 pb-4 select-none">
          <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase">
            ARCHIVE CLASSIFICATION INDEX
          </div>
          <button
            onClick={() => navigate('/roles')}
            className="px-3 py-1 rounded border border-slate-800 hover:border-slate-600 bg-slate-950/20 text-[10px] text-slate-400 hover:text-slate-200 transition-all font-mono uppercase cursor-pointer"
          >
            &larr; Go Back to Main Menu
          </button>
        </div>

        {/* Breadcrumb Navigation Trail Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-[10px] tracking-[0.3em] text-slate-500 mb-2 uppercase">
            CRISULATOR / {roleLabels[role] || 'OPERATIONS'} / CENTRAL ARCHIVE
          </div>
          {/* CHANGE 2: Replaced casual headers with high-fidelity, realistic enterprise titles */}
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-slate-50 mb-2 tracking-tight">
            Incident Archive
          </h2>
          <p className="font-sans text-slate-400 text-xs sm:text-sm max-w-2xl mb-8 leading-relaxed">
            Replay real-world inspired operational crises across engineering, cybersecurity, and communications response teams. Each record contains immutable log traces, system metrics signatures, and structured validation criteria.
          </p>
        </motion.div>

        {/* Dynamic Telemetry Status Container Blocks */}
        {loading ? (
          <div className="text-slate-500 text-xs tracking-widest animate-pulse">
            LOADING ACTIVE TELEMETRY REGISTRY STREAMS...
          </div>
        ) : error ? (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 text-center max-w-xl mx-auto">
            <div className="text-red-400 text-xs uppercase font-bold tracking-wider mb-2">
              CRITICAL LINK BREAKAGE DETECTED
            </div>
            <p className="font-sans text-slate-400 text-xs mb-4">
              Central simulation service database is currently unreachable. Live tracking metrics arrays could not be loaded cleanly into memory maps.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 px-3 py-1 rounded transition-colors"
            >
              RETRY CONNECTION
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scenarios.map((s, i) => {
              const style = SEV_STYLES[s.severity] || SEV_STYLES.SEV2;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate('/command', { state: { role, scenarioId: s.id } })}
                  // CHANGE 4: Removed neon-glow patterns for real-world workstation aesthetic layouts
                  className="relative bg-slate-900/40 rounded-xl border border-slate-800/80 p-6 cursor-pointer hover:border-slate-700 hover:bg-white/[0.02] transition-all group overflow-hidden shadow-panel"
                >
                  {/* CHANGE 7: Added continuous high-visibility threat intensity vertical anchor indicator lines */}
                  <div className={`absolute top-0 left-0 h-full w-1 ${style.bar}`} />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
                          {s.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                          TARGET_SVC: {s.service?.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="font-sans font-bold text-lg text-slate-200 mb-1 group-hover:text-slate-50 transition-colors">
                        {s.title}
                      </h3>

                      <p className="font-sans text-slate-400 text-xs sm:text-sm leading-relaxed max-w-3xl">
                        {s.description}
                      </p>

                      {/* CHANGE 6: Immersive descriptive quote snapshots indicating operational damage */}
                      {s.brief && (
                        <div className="mt-3 border-l-2 border-slate-800 pl-3 text-xs text-slate-500 italic font-sans leading-relaxed select-none">
                          &ldquo;{s.brief}&rdquo;
                        </div>
                      )}

                      {/* CHANGE 5: Built tracking indices to provide robust context realism parameters */}
                      <div className="flex flex-wrap gap-4 mt-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-t border-slate-800/40 pt-3">
                        <span className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-slate-600" />
                          Impact: Global Tier-1
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-slate-600" />
                          Status: Archived
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-slate-600" />
                          Verified Trace Record
                        </span>
                      </div>
                    </div>

                    {/* CHANGE 3: Swapped gamified text handles over to industry-standard action buttons */}
                    <div className="shrink-0 self-start sm:self-center flex items-center gap-1.5 rounded border border-slate-800 bg-black/20 px-3 py-1 text-[10px] font-mono text-slate-400 group-hover:border-slate-600 group-hover:text-slate-200 group-hover:bg-slate-800/40 transition-all uppercase tracking-wide">
                      <span className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
                      Open Incident
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Navigation Escape Link Interface Footer */}
        <div className="mt-8 border-t border-slate-800/40 pt-4">
          <button
            onClick={() => navigate('/roles')}
            className="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            &larr; Return to Role Profiling Console
          </button>
        </div>
      </div>
    </div>
  );
}