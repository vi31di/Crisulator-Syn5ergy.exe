import React, { useState } from 'react';
import { Shield, ShieldAlert, Cpu, RefreshCw, Send, AlertOctagon, RotateCcw } from 'lucide-react';

const DEPLOY_MAP = {
  payments_retry_storm: { culprit: '#381', stable: '#380', target: 'payments-api' },
  aws_s3_outage: { culprit: '#422', stable: '#421', target: 's3-routing-gateway' },
  cloudflare_global_outage: { culprit: '#510', stable: '#509', target: 'cloudflare-waf' },
  facebook_bgp_outage: { culprit: '#789', stable: '#788', target: 'bgp-peer-router' },
  gitlab_database_deletion: { culprit: '#901', stable: '#900', target: 'gitlab-db-cleanup' },
  knight_capital_disaster: { culprit: '#1044', stable: '#1043', target: 'knight-trading-router' }
};

const DeployConsole = ({ onDeployAction, currentMetrics, scenario }) => {
  const scenarioId = scenario?.id || 'payments_retry_storm';
  const data = DEPLOY_MAP[scenarioId] || { culprit: '#381', stable: '#380', target: 'payments-api' };

  const [activeTask, setActiveTask] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  const handleAction = (actionKey, label) => {
    if (activeTask) return;
    
    setActiveTask(actionKey);
    setProgress(0);
    setLogs([`[INIT] Launching operational action: ${label}...`]);

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setActiveTask(null);
            // Trigger actual consequences in parent state
            onDeployAction(actionKey);
          }, 300);
          return 100;
        }
        return p + 10;
      });
    }, 200);

    // Mock logs during progressive deployment
    setTimeout(() => setLogs(l => [...l, `[PROVISION] Resolving replica schedules in default namespace...`]), 400);
    setTimeout(() => setLogs(l => [...l, `[ROUTING] Cordoning gateway routing pools...`]), 800);
    setTimeout(() => setLogs(l => [...l, `[DEPLOY] Applying target patches to kubernetes nodes...`]), 1200);
    setTimeout(() => setLogs(l => [...l, `[SUCCESS] Deployment task finalized. Synced in 2.1s.`]), 1800);
  };

  return (
    <div className="flex-1 bg-[#0a0f14] flex flex-col h-full overflow-hidden text-slate-300 font-sans">
      
      {/* Header */}
      <div className="bg-[#11161d] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-red-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] font-mono">
            Orchestrator Deployment Console
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          NAMESPACE: production-{data.target}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* Left Side: Big Powerful Buttons */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          
          <div className="space-y-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">
              Mitigation Actions
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Drain Traffic */}
              <button
                disabled={activeTask}
                onClick={() => handleAction('drain', 'Drain Client Traffic')}
                className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-950/5 hover:bg-yellow-950/20 hover:border-yellow-500/60 transition-all text-left group disabled:opacity-40"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-yellow-400 group-hover:scale-110 transition-transform" size={16} />
                  <span className="font-bold text-sm text-slate-100 font-mono">Drain Traffic</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans">
                  Throttle incoming API calls at the gateway to drop connections early. Resolves database transaction query backlogs.
                </p>
              </button>

              {/* Scale Replicas */}
              <button
                disabled={activeTask}
                onClick={() => handleAction('scale', 'Scale API Replicas')}
                className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/5 hover:bg-cyan-950/20 hover:border-cyan-500/60 transition-all text-left group disabled:opacity-40"
              >
                <div className="flex items-center gap-2">
                  <Send className="text-cyan-400 group-hover:scale-110 transition-transform" size={16} />
                  <span className="font-bold text-sm text-slate-100 font-mono">Scale Replicas</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans">
                  Scale {data.target} pods from 3 to 10. Relieves CPU saturation, but will exacerbate database connections pool saturation.
                </p>
              </button>

            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">
              Destructive / Override Actions
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Restart DB */}
              <button
                disabled={activeTask}
                onClick={() => handleAction('restart_db', 'Reboot PostgreSQL Service')}
                className="p-4 rounded-xl border border-red-500/30 bg-red-950/5 hover:bg-red-950/20 hover:border-red-500/60 transition-all text-left group disabled:opacity-40"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="text-red-400 group-hover:scale-110 transition-transform" size={16} />
                  <span className="font-bold text-sm text-slate-100 font-mono">Reboot PostgreSQL</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans">
                  Restart statefulset databases immediately. Warning: If traffic is not drained first, it will trigger an aggressive recursive retry storm.
                </p>
              </button>

              {/* Rollback Deployment */}
              <button
                disabled={activeTask}
                onClick={() => handleAction('rollback', `Rollback to PR ${data.stable}`)}
                className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/5 hover:bg-purple-950/20 hover:border-purple-500/60 transition-all text-left group disabled:opacity-40 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl pointer-events-none" />
                <div className="flex items-center gap-2">
                  <RotateCcw className="text-purple-400 group-hover:scale-110 transition-transform" size={16} />
                  <span className="font-bold text-sm text-slate-100 font-mono">Rollback to PR {data.stable} (Revert PR {data.culprit})</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans">
                  Revert to the stable version preceding PR {data.culprit}. Re-enables timeouts on {data.target}. High operational recovery probability.
                </p>
              </button>

            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl border border-red-950 bg-red-950/10 flex gap-2.5 items-start">
            <AlertOctagon className="text-red-500 mt-0.5 shrink-0" size={14} />
            <div className="text-[11px] font-sans">
              <span className="text-red-400 font-bold block">CAUTION: DEPLOYMENT MUTATIONS ARE LIVE</span>
              All actions committed here modify real production states. Upstream connections, databases, and stakeholder stress profiles respond dynamically.
            </div>
          </div>

        </div>

        {/* Right Side: Log Feed & Progress */}
        <div className="w-full md:w-[40%] bg-[#080d12] border border-slate-800 rounded-xl p-4 flex flex-col shrink-0">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono mb-2">
            Deployment Terminal Logs
          </div>
          
          <div className="flex-1 bg-[#05080c] border border-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-400 space-y-2 overflow-y-auto scrollbar-ops">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic select-none">
                Waiting for deployment pipeline activation...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes('SUCCESS') ? 'text-green-400 font-bold' : log.includes('INIT') ? 'text-cyan-400' : ''}>
                  {log}
                </div>
              ))
            )}
          </div>

          {/* Progress bar */}
          {activeTask && (
            <div className="mt-4 space-y-1.5 font-mono select-none">
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>DEPLOYING OPERATIONAL COMMAND</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-[#0d121a] rounded-full overflow-hidden border border-slate-900">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default DeployConsole;
