import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Server, Users, Activity, ChevronRight } from 'lucide-react';
import { api } from '../data/api';

const BriefingScreen = ({ roomData, onJoin }) => {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will pick a random scenario for the given role
    const fetchScenario = async () => {
      try {
        const scenariosList = await api.getScenarios(roomData.role === 'cyber' ? 'security' : (roomData.role === 'pr' ? 'comms' : 'oncall'));
        if (scenariosList && scenariosList.length > 0) {
           // pick a random scenario to play
           const randomScen = scenariosList[Math.floor(Math.random() * scenariosList.length)];
           const fullScenario = await api.getScenario(roomData.role === 'cyber' ? 'security' : (roomData.role === 'pr' ? 'comms' : 'oncall'), randomScen.id);
           setScenario(fullScenario);
           // pass scenario back to parent so it knows what to load
           roomData.scenarioId = fullScenario.id;
        }
      } catch (err) {
        console.error("Failed to fetch scenario", err);
      }
      setLoading(false);
    };
    fetchScenario();
  }, [roomData]);

  if (loading || !scenario) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center h-full text-ops-glow font-mono">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <AlertTriangle size={48} className="opacity-50" />
        </motion.div>
        <p className="mt-4 animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col h-full bg-ops-bg text-ops-muted font-sans">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-4xl w-full m-auto"
      >
        {/* Warning Banner */}
        <div className="bg-ops-red/10 border border-ops-red/30 p-4 rounded-t flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-ops-red animate-pulse" size={24} />
            <h2 className="text-xl font-bold font-mono tracking-wider text-ops-red">PAGE INCIDENT ALERT</h2>
          </div>
          <div className="font-mono text-sm text-ops-red/80 opacity-80">
            {new Date().toISOString()}
          </div>
        </div>

        <div className="bg-ops-desk border-x border-b border-ops-border p-8 rounded-b shadow-panel relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ops-red/5 rounded-full blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-6 border-b border-ops-border pb-6 relative z-10">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">{scenario.title}</h1>
              <p className="text-xl text-ops-muted/80 font-light">{scenario.description || scenario.storyIntro}</p>
            </div>
            <div className="bg-ops-red/10 text-ops-red border border-ops-red/30 px-4 py-2 rounded-lg font-bold font-mono text-xl flex items-center gap-2">
              <Activity size={20} />
              {scenario.severity}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
            <div className="space-y-4">
              <div className="bg-ops-terminal/50 p-4 rounded-lg border border-ops-border">
                <h3 className="text-xs font-bold text-ops-muted/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Server size={14} /> Impacted Systems
                </h3>
                <ul className="space-y-1">
                  {(scenario.systemsImpacted || [scenario.service]).map((sys, idx) => (
                    <li key={idx} className="text-ops-muted font-mono text-sm">• {sys}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-ops-terminal/50 p-4 rounded-lg border border-ops-border">
                <h3 className="text-xs font-bold text-ops-muted/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Users size={14} /> Incident Owner
                </h3>
                <div className="text-ops-muted font-mono text-sm">
                  Agent {roomData.userId} ({roomData.role.toUpperCase()})
                </div>
              </div>
              <div className="bg-ops-terminal/50 p-4 rounded-lg border border-ops-border">
                <h3 className="text-xs font-bold text-ops-muted/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock size={14} /> Escalation Path
                </h3>
                <div className="text-ops-muted font-mono text-sm">
                  CTO & Stakeholders notified. Immediate mitigation required.
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onJoin(scenario)}
            className="w-full bg-ops-red/10 hover:bg-ops-red/20 text-ops-red border border-ops-red/50 font-bold py-5 rounded flex items-center justify-center gap-3 transition-all hover:scale-[1.01] text-lg relative z-10 font-mono tracking-widest"
          >
            ENTER INCIDENT SPACE <ChevronRight />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BriefingScreen;
