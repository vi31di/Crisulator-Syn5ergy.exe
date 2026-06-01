/**
 * Syn5ergy v2 - Post-Incident Operational Retrospective Dashboard
 * Formats data from incident state records into a professional incident review document.
 * Removes gamified visual-novel aesthetics, tracking analytics via a clean KPI framework.
 */
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, FileText, Clock, Server, Terminal as TermIcon, Layers } from 'lucide-react';
import { api } from '../data/api.js';
import { useGame } from '../context/GameContext.jsx';

function StatCard({ label, value, description, statusColor = 'text-slate-100' }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl shadow-panel font-mono">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={`text-2xl font-bold mt-1.5 tracking-tight ${statusColor}`}>{value}</div>
      {description && <div className="text-[10px] text-slate-600 mt-1 font-sans">{description}</div>}
    </div>
  );
}

export function DebriefPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useGame();

  const [leaderboard, setLeaderboard] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  // Extract properties safely out from incoming router state bundles
  const finalScore = state?.score ?? 0;
  const role = state?.role ?? 'oncall';
  const actionLog = state?.actionLog || [];
  const scenarioId = state?.scenarioId || 'retry_storm';
  const scenario = state?.scenario || {};
  const timeTaken = state?.timeTaken || 0;

  // CHANGE 1: Professional status classification replacing gamified strings
  const incidentStatus = finalScore >= 80
    ? 'Incident Successfully Mitigated'
    : finalScore >= 60
      ? 'Partial Recovery Achieved'
      : 'Incident Escalated to Unstable State';

  const statusColorClass = finalScore >= 80
    ? 'text-green-400 border-green-500/20 bg-green-500/5'
    : finalScore >= 60
      ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
      : 'text-red-400 border-red-500/20 bg-red-500/5';

  const goodActions = actionLog.filter(a => a.type === 'good' || a.outcome === 'good');
  const badActions = actionLog.filter(a => a.type === 'bad' || a.outcome === 'bad');

  const getOperationalAssessment = (log) => {
    const isGood = log.type === 'good' || log.outcome === 'good';
    const cmd = (log.command || log.action || '').toLowerCase();
    
    if (isGood) {
      if (cmd.includes('logs') || cmd.includes('describe') || cmd.includes('get') || cmd.includes('cat') || cmd.includes('grep') || cmd.includes('show') || cmd.includes('list') || cmd.includes('check') || cmd.includes('verify') || cmd.includes('status') || cmd.includes('info') || cmd.includes('view')) {
        return 'Observational';
      }
      return 'Recommended';
    } else {
      return 'Risky';
    }
  };

  useEffect(() => {
    const submitAndLoadRegistry = async () => {
      try {
        await api.submitScore({
          scenario_id: scenarioId,
          role,
          score: finalScore,
          time_taken: timeTaken,
          username: user?.username || 'anonymous',
        });
        setSubmitted(true);
      } catch (err) {
        console.error("Failed to commit final score metrics entry:", err);
      }

      try {
        const lb = await api.getLeaderboard();
        setLeaderboard(lb.slice(0, 5));
      } catch (err) {
        console.error("Failed to load global scores array reference:", err);
      }
    };
    submitAndLoadRegistry();
  }, [scenarioId, role, finalScore, timeTaken, user?.username]);

  const roleLabels = {
    oncall: 'On-Call SWE',
    cybersecurity: 'Cybersecurity Analyst',
    comms: 'PR / Comms Manager'
  };

  return (
    <div className="min-h-screen bg-transparent pt-10 pb-20 px-4 font-mono text-slate-300 selection:bg-slate-800">
      <div className="mx-auto max-w-6xl">

        {/* Retrospective Document Header Area */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 border-b border-slate-800 pb-5"
        >
          <div className="text-[10px] tracking-[0.25em] text-slate-500 mb-1.5 uppercase">
            CRISULATOR CENTRAL // INCIDENT RETROSPECTIVE AUDIT REPORT
          </div>
          <h1 className="font-sans font-black text-2xl sm:text-3xl text-slate-100 tracking-tight mb-2">
            Post-Incident Retrospective
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            Review engineering actions, timeline trace vectors, and dynamic system evaluations captured during the lifecycle of incident record <span className="text-slate-200 font-mono">#{scenarioId}</span>.
          </p>
        </motion.div>

        {/* CHANGE: High-fidelity analytics KPI grid replacing legacy radial charts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <StatCard
            label="Operational Index Evaluation"
            value={`${finalScore} / 100`}
            description="Aggregated score mapped directly from recovery speeds and playbook precision parameters."
            statusColor={finalScore >= 80 ? 'text-green-400' : finalScore >= 60 ? 'text-amber-400' : 'text-red-400'}
          />
          <StatCard
            label="Triage Precision Metrics"
            value={`${goodActions.length} Deployed`}
            description={`Executed across environment nodes with ${badActions.length} anomalous step failures logged.`}
          />
          <StatCard
            label="Resolution Assessment"
            value={roleLabels[role]?.toUpperCase() || 'ENGINEER'}
            description={`Incident profile: ${scenario.title || 'System Degradation Outage'}`}
          />
        </motion.div>

        {/* Dynamic Status Alert Strip */}
        <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 select-none ${statusColorClass}`}>
          {finalScore >= 60 ? <ShieldCheck size={16} className="shrink-0" /> : <ShieldAlert size={16} className="shrink-0" />}
          <div className="text-xs uppercase tracking-wide font-bold">
            Resolution Profile Matrix Status // {incidentStatus}
          </div>
        </div>

        {/* Main Content Layout Columns Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left Split View: Structured Execution Logs History Terminal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-6 shadow-panel">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-900/60 pb-2 select-none">
                <TermIcon size={13} className="text-slate-500" />
                Command Execution History Logs
              </h3>

              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-ops">
                {actionLog.length === 0 ? (
                  <p className="text-slate-600 text-xs italic font-sans py-4">
                    Zero terminal inputs logged during simulation lifespan. System variables allowed to decay past SLA boundary conditions.
                  </p>
                ) : actionLog.map((log, i) => {
                  const isGood = log.type === 'good' || log.outcome === 'good';
                  const assessment = getOperationalAssessment(log);
                  return (
                    <div key={i} className={`border-l-2 pl-4 py-1 bg-black/10 rounded-r border-slate-800 ${isGood ? 'border-l-green-500/50 bg-green-500/[0.01]' : 'border-l-red-500/50 bg-red-500/[0.01]'
                      }`}>
                      <div className="flex justify-between items-center mb-1">
                        <code className="text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800/80 px-2 py-0.5 rounded">
                          $ {log.command || log.action}
                        </code>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${isGood ? 'text-green-400 bg-green-500/10 border border-green-500/10' : 'text-red-400 bg-red-500/10 border border-red-500/10'}`}>
                          {assessment}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-slate-400 leading-relaxed">{log.feedback || 'Action logged to trace.'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Structured Root Cause Analysis Data Field Module */}
            <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-6 shadow-panel">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-900/60 pb-2 select-none">
                <FileText size={13} className="text-slate-500" />
                System Root Cause Evaluation Report
              </h3>
              <p className="font-sans text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/10 p-4 border border-slate-800/40 rounded-lg">
                {scenario.root_cause || 'Telemetry data points confirm the active incident cascaded from localized resource bottlenecks into upstream degradation due to lack of circuit breakers and cascade containment limits.'}
              </p>
            </div>
          </div>

          {/* Right Split View: Playbook Validations & Impact Architecture Summary */}
          <div className="lg:col-span-1 space-y-6">

            {/* Ideal Playbook Matching Module Checklist */}
            <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-6 shadow-panel">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-900/60 pb-2 select-none">
                <Layers size={13} className="text-slate-500" />
                Target Playbook Verification
              </h3>

              <ol className="space-y-2.5 pt-1">
                {(Array.isArray(scenario?.ideal_steps) ? scenario.ideal_steps : ['ack', 'diagnose', 'mitigate', 'resolve']).map((step, i) => {
                  const stepStr = typeof step === 'string' ? step : String(step || '');
                  const stepToken = stepStr.toLowerCase().split(' ')[0] || '';
                  // Match cleanly if player execution strings contained target playbook criteria tokens
                  const wasExecuted = Array.isArray(actionLog) && actionLog.some(a => {
                    const cmdStr = (a && typeof a.command === 'string') ? a.command : ((a && typeof a.action === 'string') ? a.action : '');
                    return cmdStr.toLowerCase().includes(stepToken);
                  });

                  return (
                    <div key={i} className="flex items-center justify-between gap-3 border border-slate-900/60 bg-black/10 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-[10px] text-slate-600 w-4 select-none">{String(i + 1).padStart(2, '0')}.</span>
                        <code className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-0.5 rounded tracking-wide truncate border border-slate-800/40">
                          {step}
                        </code>
                      </div>

                      {/* CHANGE: Formal text label flags substituting gamified visual check handles */}
                      <span className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded font-bold ${wasExecuted ? 'text-green-400 bg-green-500/10 border border-green-500/10' : 'text-slate-600 bg-slate-800/10'
                        }`}>
                        {wasExecuted ? 'Applied' : 'Omitted'}
                      </span>
                    </div>
                  );
                })}
              </ol>
            </div>

            {/* Target Topology Environment Metadata Block */}
            <div className="bg-slate-900/20 border border-slate-800 rounded-xl p-5 shadow-panel font-mono text-[11px] space-y-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-1.5 select-none">
                Target Architecture Map
              </div>
              <div className="flex justify-between items-center bg-black/10 p-2 rounded border border-slate-900">
                <span className="text-slate-500">Blast Footprint:</span>
                <span className="text-slate-300 font-bold uppercase">Global Tier-1</span>
              </div>
              <div className="flex justify-between items-center bg-black/10 p-2 rounded border border-slate-900">
                <span className="text-slate-500">Systems Stabilized:</span>
                <span className="text-green-400 font-bold">{goodActions.length} Nodes</span>
              </div>
              <div className="flex justify-between items-center bg-black/10 p-2 rounded border border-slate-900">
                <span className="text-slate-500">Unresolved Risk Index:</span>
                <span className={`font-bold ${badActions.length > 2 ? 'text-red-400' : 'text-slate-400'}`}>
                  {badActions.length > 2 ? 'High Residual' : 'Nominal'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Console Navigation Control Row Footer */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center border-t border-slate-800/40 pt-6">
          <button
            onClick={() => navigate('/scenarios', { state: { role } })}
            className="px-6 py-2 rounded-lg border border-slate-800 hover:border-slate-600 text-slate-300 font-mono text-xs hover:bg-white/[0.02] transition-all bg-black/20 uppercase tracking-wider"
          >
            Load Another Archive
          </button>
          <button
            onClick={() => navigate('/roles')}
            className="px-6 py-2 rounded-lg border border-slate-800 hover:border-slate-600 text-slate-300 font-mono text-xs hover:bg-white/[0.02] transition-all bg-black/20 uppercase tracking-wider"
          >
            Switch Domain Role
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs hover:border-slate-600 transition-all uppercase tracking-widest shadow-md"
          >
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}