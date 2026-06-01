/**
 * Syn5ergy h2 Core Workspace Orchestrator
 * Central simulation lifecycle environment routing page context, layout parameters,
 * and state-aware reactive panels without legacy WebSocket/multiplayer wrappers.
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TermIcon, MessageSquare, AlertTriangle, Shield, Activity, FileText, Code, GitPullRequest, Database, Cpu, CheckCircle } from 'lucide-react';

// Core State-Aware Operational Sub-Panels
import IncidentBridge from './IncidentBridge';
import { Terminal } from './Terminal';
import { LogsPanel } from './LogsPanel';
import { MetricsPanel } from './MetricsPanel';
import ScoreScreen from './ScoreScreen';
import PRWorkspace from './PRWorkspace';
import CyberSecurityWorkspace from './CyberSecurityWorkspace';

// New Sub-Tabs
import GitHubViewer from './GitHubViewer';
import SQLConsole from './SQLConsole';
import DeployConsole from './DeployConsole';

// Transport Layer State Sub-routines
import { api, incidentState, updateIncidentState, resetIncidentState } from '../data/api';

const DesktopEnvironment = () => {
  // Extract location routing parameters natively
  const location = useLocation();
  const navigate = useNavigate();
  const incomingRole = location.state?.role || 'oncall';
  const incomingScenarioId = location.state?.scenarioId || 'payments_retry_storm';

  // App workspace view controls
  const [activeApp, setActiveApp] = useState(
    incomingRole === 'comms' || incomingRole === 'pr'
      ? 'pr'
      : (incomingRole === 'security' || incomingRole === 'cybersecurity' ? 'security' : 'metrics')
  );
  const [chatOpen, setChatOpen] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  // Handle ESC key to skip walkthrough
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showWalkthrough) {
        setShowWalkthrough(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWalkthrough]);

  // Simulation Lifecycle States
  const [phase, setPhase] = useState('briefing'); // briefing | simulation | score
  const [scenario, setScenario] = useState(null);

  // Local synchronized state variables
  const [timeline, setTimeline] = useState([]);
  const [actions, setActions] = useState([]);
  const [incidentPhase, setIncidentPhase] = useState('detection');
  const [score, setScore] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionLogs, setSessionLogs] = useState([]);

  // Vertical Slice & Gameplay States
  const [rootCauseFound, setRootCauseFound] = useState(false);
  const [showCinematicEureka, setShowCinematicEureka] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [uiModifiers, setUiModifiers] = useState({});
  const [tempo, setTempo] = useState('stable');
  const [slaCountdown, setSlaCountdown] = useState(480); // 8-minute SLA Countdown
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [externalMessage, setExternalMessage] = useState(null);

  // Auto Load Selected Scenario Effect on Environment Initialization
  useEffect(() => {
    const loadScenarioContext = async () => {
      try {
        const res = await api.getScenario(incomingRole, incomingScenarioId);
        setScenario(res);
        setSessionLogs(res.initial_logs || res.logs || []);
      } catch (err) {
        console.warn("Failed to reach central scenario registry, applying fallback baseline:", err);
        const fallbackLogs = [
          `[${new Date().toLocaleTimeString()}] emergency: abnormal latency threshold exceeded.`,
          `[${new Date().toLocaleTimeString()}] monitoring: high frequency 5xx error distribution patterns.`
        ];
        setSessionLogs(fallbackLogs);
        setScenario({
          id: incomingScenarioId,
          title: incomingScenarioId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          severity: 'SEV0',
          service: 'production-gateway',
          metrics: {
            error_rate: 45,
            p95_latency: 5200,
            db_connections: 88,
            cpu: 92
          },
          initial_logs: fallbackLogs
        });
      }
    };

    resetIncidentState();
    const initialLine = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: 'Incident operational workspace console active. Telemetry routing established.'
    };
    setTimeline([initialLine]);
    updateIncidentState({
      phase: 'detection',
      timeline: [{ time: initialLine.time, action: 'SYSTEM_BOOT', outcome: 'good', feedback: initialLine.text }]
    });

    loadScenarioContext();
  }, [incomingRole, incomingScenarioId]);

  const handleStartSimulation = async () => {
    setLastActivity(Date.now());
    try {
      await api.startSession(incomingScenarioId);
    } catch (err) {
      console.warn("Failed to auto-start session:", err);
    }
    setPhase('simulation');
    setShowWalkthrough(true);
  };

  // SLA Count down timer
  useEffect(() => {
    if (phase !== 'simulation' || !scenario) return;
    const timer = setInterval(() => {
      setSlaCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, scenario]);

  // Telemetry poller heartbeat effect
  useEffect(() => {
    if (phase !== 'simulation' || !scenario) return;

    const pollTelemetry = async () => {
      try {
        const tickData = await api.getMetrics(scenario.id);
        setLiveMetrics(tickData.metrics);
        setUiModifiers(tickData.ui_fatigue_modifiers || {});
        setScore(tickData.simulation_state?.score || 0);
        setIncidentPhase(tickData.simulation_state?.status?.toLowerCase() || 'detection');
        setTempo(tickData.simulation_state?.tempo || 'stable');
        
        if (tickData.logs && tickData.logs.length > 0) {
          setSessionLogs(tickData.logs);
        }

        if (tickData.spontaneous_events && tickData.spontaneous_events.length > 0) {
          tickData.spontaneous_events.forEach(evt => {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setTimeline(prev => {
              if (prev.some(t => t.text.includes(evt.message))) return prev;
              return [...prev, { time: timestamp, text: `[ALERT] ${evt.sender}: ${evt.message}` }];
            });
          });
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic telemetry tick logs:", err);
      }
    };

    pollTelemetry();
    const intervalId = setInterval(pollTelemetry, 4000);
    return () => clearInterval(intervalId);
  }, [phase, scenario]);

  // Background Audio hum and chime hooks
  useEffect(() => {
    if (phase !== 'simulation' || !soundEnabled || !scenario) return;

    let audioCtx = null;
    let alarmInterval = null;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      if (!rootCauseFound) {
        // Tension Hum loop
        alarmInterval = setInterval(() => {
          if (!audioCtx || audioCtx.state === 'suspended') return;

          const playTone = (delay) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime + delay);

            gain.gain.setValueAtTime(0.015, audioCtx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.6);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + delay);
            osc.stop(audioCtx.currentTime + delay + 0.7);
          };

          playTone(0);
          playTone(0.3);
        }, 4500);
      } else {
        // Celebrating chime sweep (CTO success chime)
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);

          gain.gain.setValueAtTime(0.025, audioCtx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.1 + 0.45);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + idx * 0.1);
          osc.stop(audioCtx.currentTime + idx * 0.1 + 0.5);
        });
      }
    } catch (err) {
      console.warn("Web Audio API disabled by browser safety policies:", err);
    }

    return () => {
      if (alarmInterval) clearInterval(alarmInterval);
      if (audioCtx) audioCtx.close().catch(() => { });
    };
  }, [phase, rootCauseFound, soundEnabled, scenario]);

  // Command input handler
  const handleTerminalCommand = async (cmd) => {
    setLastActivity(Date.now());
    setActions(prev => [...prev, cmd]);

    try {
      const result = await api.evaluateCommand({
        command: cmd,
        scenario_id: scenario.id,
        role: incomingRole,
        current_state: incidentState.metrics
      });

      setScore(incidentState.score);
      setTimeline([...incidentState.timeline.map(t => ({ time: t.time, text: `${t.action.toUpperCase()} -> [${t.outcome.toUpperCase()}] ${t.feedback}` }))]);
      
      if (result.logs) {
        setSessionLogs(result.logs);
      }

      if (incidentState.phase !== incidentPhase) {
        setIncidentPhase(incidentState.phase);
      }

      if (result.agent_reaction) {
        setExternalMessage({
          sender: result.agent_reaction.agent,
          role: result.agent_reaction.role,
          content: result.agent_reaction.message.replace(/^\[.*?\]\s*/, ''),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      return result;

    } catch (err) {
      console.error("Failed to parse command execution streams smoothly:", err);
      return { terminal_output: "ERROR: Failed to connect to telemetry backend." };
    }
  };

  const handleDeployAction = async (actionKey) => {
    return await handleTerminalCommand(actionKey);
  };

  const handleRootCauseIdentified = () => {
    setRootCauseFound(true);
    setShowCinematicEureka(true);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTimeline(prev => [
      ...prev,
      { time: timestamp, text: "EUREKA MOMENT: Identified infinite retry loop bug in PR #381 code diff." }
    ]);

    updateIncidentState({
      discoveries: [...incidentState.discoveries, "Infinite retry loop in PR #381"]
    });
  };

  const handleChatLogAppend = (msgContent) => {
    setLastActivity(Date.now());
    // Chat messages must not appear inside operational logs.
  };

  const handleTerminateSimulationLoop = () => {
    setPhase('score');
  };

  const handleRestartConsoleFlow = () => {
    resetIncidentState();
    setScenario(null);
    setTimeline([]);
    setActions([]);
    window.location.href = '/';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if ((phase === 'simulation' || phase === 'briefing') && !scenario) {
    return (
      <div className="min-h-screen w-full bg-[#0b1016] flex flex-col items-center justify-center text-slate-500 font-mono text-xs tracking-widest">
        <div className="animate-pulse mb-2">LOADING ACTIVE INCIDENT WORKSPACE ENVIRONMENT...</div>
        <div className="text-[10px] text-slate-600 font-sans">Synchronizing system telemetry maps safely.</div>
      </div>
    );
  }

  const getTourSteps = () => {
    if (incomingRole === 'comms' || incomingRole === 'pr') {
      return [
        {
          title: "Viral Social Outrage Feed",
          desc: "Watch live feeds of social media backlash. Retweets and likes indicate which topics are gaining viral momentum and harming your brand.",
          highlightPos: { top: "35%", left: "14%" },
          popupPos: { top: "30%", left: "30%" },
          arrow: "left"
        },
        {
          title: "Reputation Index Monitor",
          desc: "Balance three critical indicators: Public Trust (must hit 100% to win), Outrage Index, and Legal Risk. Keep them stable to avoid regulatory shutdowns.",
          highlightPos: { top: "25%", right: "12%" },
          popupPos: { top: "20%", right: "28%" },
          arrow: "right"
        },
        {
          title: "Reporter Inquiry & GMAT Phase",
          desc: "Analyze dynamic press inquiries from major outlets like Reuters or Bloomberg. Responses adapt as you progress through Detection, Escalation, and Mitigation.",
          highlightPos: { top: "20%", left: "45%" },
          popupPos: { top: "30%", left: "20%" },
          arrow: "left"
        },
        {
          title: "Strategic Decision Deck",
          desc: "Select pre-composed response actions. Each carries a risk rating (Low/Medium/High). Align with legal or prioritize rapid transparency depending on the threat.",
          highlightPos: { bottom: "160px", left: "45%" },
          popupPos: { bottom: "200px", left: "20%" },
          arrow: "down"
        },
        {
          title: "Crisis Direct Messages",
          desc: "Read private inputs from internal stakeholders like the CEO and Legal Counsel. They provide critical context but often advocate conflicting strategies.",
          highlightPos: { bottom: "120px", right: "12%" },
          popupPos: { bottom: "160px", right: "28%" },
          arrow: "right"
        }
      ];
    }
    
    if (incomingRole === 'security' || incomingRole === 'cybersecurity') {
      return [
        {
          title: "SIEM Forensic & Alert Feed",
          desc: "Monitor live threat signals, intruder geolocations, and malicious routing. Keep a close eye on the chronological intrusion timeline.",
          highlightPos: { top: "35%", left: "15%" },
          popupPos: { top: "30%", left: "32%" },
          arrow: "left"
        },
        {
          title: "Device & Access Monitor",
          desc: "Inspect current perimeter VPN sessions and MFA authorization logs in real-time. Spot unauthorized connections and MFA push-bombing logs.",
          highlightPos: { top: "35%", left: "45%" },
          popupPos: { top: "30%", left: "20%" },
          arrow: "left"
        },
        {
          title: "Malware Decoder Sandbox",
          desc: "Switch to this tab to paste Base64 payload strings from logs. Run deobfuscation in the isolated virtual machine to reveal the intruder's script trace.",
          highlightPos: { top: "25px", left: "50%" },
          popupPos: { top: "65px", left: "30%" },
          arrow: "up"
        },
        {
          title: "Access Containment Console",
          desc: "Execute target containment commands: terminate compromised VPN sessions, isolate affected subnets, rotate PAM secrets, or trigger emergency OT stops.",
          highlightPos: { top: "35%", right: "15%" },
          popupPos: { top: "30%", right: "32%" },
          arrow: "right"
        },
        {
          title: "Incident Response Playbook",
          desc: "Click the Playbook button to slide out the master reference sheet. It details specific attack patterns (MFA fatigue, Ransomware, Supply Chain) and mitigations.",
          highlightPos: { top: "25px", right: "260px" },
          popupPos: { top: "65px", right: "100px" },
          arrow: "up"
        }
      ];
    }
    
    // Default: On-call SWE
    return [
      {
        title: "Active Outage SLA Countdown",
        desc: "This is your Service Level Agreement clock. If this timer hits 0:00 before you isolate and mitigate the root cause, you breach SLA and fail the mission.",
        highlightPos: { top: "12px", right: "245px" },
        popupPos: { top: "52px", right: "30px" },
        arrow: "up"
      },
      {
        title: "Crisis Operations Chat-Bridge",
        desc: "This sidebar is your lifeline. Managers, technical leads, and partners will stream telemetry updates, issue warnings, and give ETAs here.",
        highlightPos: { top: "35%", right: "28.5%" },
        popupPos: { top: "30%", right: "31%" },
        arrow: "right"
      },
      {
        title: "Tactical Application Consoles",
        desc: "Use these taskbar toggles to shift between operations tools: Telemetry graphs, GitHub PR code audits, SQL DBA inspectors, Terminal CLI, and Deploy consoles.",
        highlightPos: { bottom: "25px", left: "140px" },
        popupPos: { bottom: "60px", left: "25px" },
        arrow: "down"
      },
      {
        title: "Central Forensic Workspace",
        desc: "This is your active dashboard viewport. It renders metrics, code diffs, databases, or public relations choices depending on your current console tab selection.",
        highlightPos: { top: "40%", left: "35%" },
        popupPos: { top: "35%", left: "20%" },
        arrow: "left"
      },
      {
        title: "Help & Lifecycle Controls",
        desc: "Use the Help button to restart this walkthrough at any time. When all systems are stabilized, click 'Terminate Execution' to run a postmortem retrospective.",
        highlightPos: { bottom: "25px", right: "120px" },
        popupPos: { bottom: "60px", right: "25px" },
        arrow: "down"
      }
    ];
  };

  const tourSteps = getTourSteps();


  return (
    <div className="min-h-screen w-full bg-[#070b0e] overflow-y-auto overflow-x-hidden font-mono relative flex flex-col items-center py-6 px-4">
      
      {/* Interactive Element-Pointing Tour Walkthrough */}
      {showWalkthrough && (
        <>
          {/* Dark backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/5 z-50 transition-opacity cursor-pointer"
            onClick={() => setShowWalkthrough(false)}
            title="Click backdrop to skip walkthrough"
          />

          {/* Highlight targeted glow marker dot */}
          <div 
            className="absolute z-50 pointer-events-none transition-all duration-500"
            style={tourSteps[walkthroughStep].highlightPos}
          >
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500 border border-purple-300"></span>
            </span>
          </div>

          {/* Floating Tour Guide Bezel Bezel */}
          <div 
            className="absolute z-50 bg-[#0c0f16]/95 border border-purple-900/60 rounded-2xl p-5 shadow-[0_0_30px_rgba(139,92,246,0.3)] backdrop-blur-md max-w-xs transition-all duration-500 font-sans"
            style={tourSteps[walkthroughStep].popupPos}
          >
            {/* Decorative arrow element pointing to highlight */}
            {tourSteps[walkthroughStep].arrow === "up" && (
              <div className="absolute -top-1.5 right-[160px] w-3 h-3 bg-[#0c0f16] border-t border-l border-purple-900/60 rotate-45" />
            )}
            {tourSteps[walkthroughStep].arrow === "down" && (
              <div className="absolute -bottom-1.5 left-[110px] w-3 h-3 bg-[#0c0f16] border-b border-r border-purple-900/60 rotate-45" />
            )}
            {tourSteps[walkthroughStep].arrow === "right" && (
              <div className="absolute top-[40px] -right-1.5 w-3 h-3 bg-[#0c0f16] border-t border-r border-purple-900/60 rotate-45" />
            )}
            {tourSteps[walkthroughStep].arrow === "left" && (
              <div className="absolute top-[40px] -left-1.5 w-3 h-3 bg-[#0c0f16] border-b border-l border-purple-900/60 rotate-45" />
            )}

            <div className="flex justify-between items-center mb-3 pb-2 border-b border-purple-950/40 select-none">
              <span className="text-[9px] font-bold text-purple-400 font-mono tracking-widest uppercase">
                Workspace Tour ({walkthroughStep + 1}/{tourSteps.length})
              </span>
              <button 
                onClick={() => setShowWalkthrough(false)}
                className="text-[9px] font-mono text-slate-500 hover:text-slate-350 transition-colors uppercase font-bold"
                title="Press ESC to close"
              >
                [Skip/ESC]
              </button>
            </div>

            <h4 className="font-sans font-extrabold text-sm text-slate-100 mb-1.5 tracking-tight leading-tight">
              {tourSteps[walkthroughStep].title}
            </h4>
            
            <p className="text-[11px] text-slate-405 leading-relaxed font-sans mb-4">
              {tourSteps[walkthroughStep].desc}
            </p>

            <div className="flex justify-between items-center select-none font-mono text-[9px]">
              <button
                onClick={() => setShowWalkthrough(false)}
                className="text-slate-500 hover:text-slate-350 hover:underline uppercase font-bold"
              >
                Skip
              </button>
              
              <div className="flex items-center gap-2">
                {walkthroughStep > 0 && (
                  <button
                    onClick={() => setWalkthroughStep(c => c - 1)}
                    className="px-2 py-1 rounded border border-purple-950 bg-purple-950/20 text-purple-400 hover:bg-purple-900/20 transition-colors"
                  >
                    PREV
                  </button>
                )}
                {walkthroughStep < tourSteps.length - 1 ? (
                  <button
                    onClick={() => setWalkthroughStep(c => c + 1)}
                    className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-[0_0_10px_rgba(139,92,246,0.25)]"
                  >
                    NEXT
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowWalkthrough(false);
                      setWalkthroughStep(0);
                    }}
                    className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.25)] uppercase animate-pulse"
                  >
                    Start Game
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Cinematic Eureka Event Panel */}
      <AnimatePresence>
        {showCinematicEureka && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none"
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none animate-pulse" />
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="max-w-xl w-full p-8 rounded-3xl border-2 border-green-500 bg-[#0d1218] shadow-[0_0_80px_rgba(34,197,94,0.4)] flex flex-col text-center relative overflow-hidden z-10"
            >
              <div className="mx-auto p-4 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 mb-5 animate-bounce">
                <CheckCircle size={36} />
              </div>

              <h2 className="font-mono text-xs uppercase tracking-widest text-green-400 font-bold mb-1">
                Incident Isolation Established
              </h2>
              <h1 className="font-sans text-3xl font-extrabold text-slate-100 tracking-tight leading-none mb-3">
                ROOT CAUSE IDENTIFIED
              </h1>

              <div className="p-4 rounded-xl bg-green-950/20 border border-green-900/40 font-mono text-xs text-green-300 mb-6 text-left leading-relaxed">
                <span className="font-bold text-slate-200 block mb-1">PR #381 {"->"} Infinite Retry Recursion</span>
                Operator successfully isolated the recursive loop inside payments checkout routing. Upstream client socket retries are locking PostgreSQL slots.
              </div>

              <div className="text-slate-400 text-xs italic font-sans mb-6">
                "Good catch. That explains the saturation pattern." — CTO (Incident Bridge)
              </div>

              <button
                onClick={() => {
                  setShowCinematicEureka(false);
                  setActiveApp('deploy');
                }}
                className="w-full py-4 rounded-xl border border-green-500 bg-green-600/20 hover:bg-green-600/40 text-green-300 font-bold tracking-widest transition-all font-mono text-xs shadow-[0_0_20px_rgba(34,197,94,0.2)] uppercase hover:scale-105 active:scale-95"
              >
                Go to Mitigation Console
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#0b1016] to-black opacity-40 fixed" />

      {/* Main Bezel Monitor Container */}
      <div className="relative z-10 w-full max-w-7xl h-[85vh] min-h-[600px] bg-[#0d1117] rounded-3xl border-[24px] border-[#0a0a0c] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_2px_15px_rgba(0,0,0,0.6)] z-40" />

        {phase === 'score' && scenario && (
          <ScoreScreen
            scenario={scenario}
            timeline={timeline}
            actions={actions}
            incidentData={{ role: incomingRole, score: score, userId: 'Operator_01' }}
            finalScore={score}
            onRestart={handleRestartConsoleFlow}
          />
        )}

        {phase === 'briefing' && scenario && (
          <div className="flex-1 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 z-30 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl w-full p-8 rounded-xl border border-red-500/50 bg-[#0d1117] shadow-[0_0_40px_rgba(239,68,68,0.15)] flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-0.5 rounded border border-red-500 bg-red-500/10 text-red-400 font-mono text-xs font-bold">
                  {scenario.severity || 'SEV0'}
                </span>
                <span className="font-mono text-slate-400 text-sm tracking-wider uppercase">{scenario.service || (incomingRole === 'comms' || incomingRole === 'pr' ? 'PR-COMMS' : incomingRole === 'security' || incomingRole === 'cybersecurity' ? 'CYBER-SOC' : 'SYSTEMS')}</span>
              </div>
              <h1 className="font-sans text-3xl font-bold text-slate-100 mb-2">{scenario.title}</h1>

              <div className="space-y-4 text-sm text-slate-300 my-6 font-mono border-l-2 border-red-500/30 pl-4 bg-red-950/10 py-3 pr-3 rounded-r-lg">
                <p><span className="text-red-400 font-bold uppercase">Situation:</span> {scenario.storyIntro || scenario.description || scenario.brief || "A critical operational incident requires immediate response."}</p>
                <p><span className="text-red-400 font-bold uppercase">Assigned Role:</span> {incomingRole.toUpperCase()}</p>
                <p><span className="text-red-400 font-bold uppercase">Stakeholders:</span> Manager, CTO, PR Team</p>
                <p><span className="text-red-400 font-bold uppercase">Directive:</span> {
                  incomingRole === 'comms' || incomingRole === 'pr'
                    ? "Manage the public outrage, control external communications, and defuse brand risk under strict time pressure."
                    : (incomingRole === 'security' || incomingRole === 'cybersecurity'
                      ? "Hunt indicators of compromise, run endpoint containment, and secure the network perimeter from active intrusion."
                      : "Diagnose the root cause, revert unstable code deployments, and restore system health before SLA expiration.")
                }</p>
              </div>

              <button
                onClick={handleStartSimulation}
                className="w-full py-3.5 rounded border border-red-500 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold tracking-widest transition-all font-mono shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                ENTER INCIDENT SPACE
              </button>
            </motion.div>
          </div>
        )}

        {phase === 'simulation' && scenario && (
          <>
            {/* Active Status Banner */}
            <div className={`px-4 py-2 flex items-center justify-between shrink-0 z-30 select-none border-b transition-colors duration-500 ${incidentPhase === 'false_recovery' ? 'bg-yellow-950/20 border-yellow-900/30 text-yellow-400' : 'bg-red-950/20 border-red-900/30 text-red-400'}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`text-red-500 ${incidentPhase === 'false_recovery' ? 'text-yellow-400 animate-[bounce_1s_infinite]' : 'animate-pulse'}`} size={14} />
                <h2 className="font-mono text-xs tracking-wide uppercase font-bold">
                  {incidentPhase === 'false_recovery' ? (
                    <span className="animate-pulse">SUSPICIOUS STABILIZATION // FALSE CALM ACTIVE</span>
                  ) : (
                    <span>Active Incident Record: <span className="text-slate-200">{scenario.title}</span></span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] text-slate-500">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-2 py-0.5 rounded border border-slate-800 bg-[#161b22] text-[8px] hover:text-slate-300 font-semibold`}
                >
                  AUDIO: {soundEnabled ? 'HUMMING' : 'MUTED'}
                </button>
                <span className={`px-2 py-0.5 rounded border font-mono text-[9px] font-bold ${slaCountdown < 120 ? 'border-red-500 text-red-400 animate-pulse bg-red-950/30' : 'border-slate-800 text-slate-300'}`}>
                  SLA: {formatTime(slaCountdown)}
                </span>
                <span className="border border-red-900/40 px-2 py-0.5 rounded bg-red-950/40 font-bold text-red-400">
                  {scenario.severity || 'CRITICAL'}
                </span>
                <span className="hidden sm:inline">TARGET_SERVICE: {(scenario.service || (incomingRole === 'comms' || incomingRole === 'pr' ? 'PR-COMMS' : incomingRole === 'security' || incomingRole === 'cybersecurity' ? 'CYBER-SOC' : 'SYSTEMS')).toUpperCase()}</span>
                <button
                  onClick={() => navigate('/scenarios')}
                  className="px-2 py-0.5 rounded border border-red-500 bg-red-950/30 text-[8.5px] text-red-400 hover:bg-red-600 hover:text-white transition-all font-semibold font-mono uppercase"
                >
                  End Scenario
                </button>
              </div>
            </div>

            {/* Split Screen Workspace Layout */}
            <div className="flex-1 flex gap-2 p-2 relative h-[calc(100%-88px)] bg-[#080c10] overflow-hidden">
              {incomingRole === 'comms' || incomingRole === 'pr' ? (
                activeApp === 'logs' ? (
                  <div className="w-full h-full rounded border border-slate-800 bg-[#0a0f14] flex flex-col relative overflow-hidden">
                    <LogsPanel
                      initialLines={sessionLogs}
                      scenario={scenario}
                      incidentPhase={incidentPhase}
                      timeline={timeline}
                    />
                  </div>
                ) : (
                  <PRWorkspace
                    scenario={scenario}
                    incidentPhase={incidentPhase}
                    timeline={timeline}
                    onCommand={handleTerminalCommand}
                    slaCountdown={slaCountdown}
                    onEndSession={(finalScore) => {
                      setScore(finalScore);
                      setPhase('score');
                    }}
                  />
                )
              ) : (incomingRole === 'security' || incomingRole === 'cybersecurity') ? (
                activeApp === 'logs' ? (
                  <div className="w-full h-full rounded border border-slate-800 bg-[#080709] flex flex-col relative overflow-hidden">
                    <LogsPanel
                      initialLines={sessionLogs}
                      scenario={scenario}
                      incidentPhase={incidentPhase}
                      timeline={timeline}
                    />
                  </div>
                ) : (
                  <CyberSecurityWorkspace
                    scenario={scenario}
                    incidentPhase={incidentPhase}
                    timeline={timeline}
                    onCommand={handleTerminalCommand}
                  />
                )
              ) : (
                <>
                  {/* Left Segment: Multi-App Panel Context */}
                  <div className="w-[70%] h-full rounded border border-slate-800 bg-[#0a0f14] flex flex-col relative overflow-hidden">
                    {activeApp === 'metrics' && (
                      <MetricsPanel
                        scenarioId={scenario.id}
                        baseMetrics={scenario.metrics}
                        incidentPhase={incidentPhase}
                        timeline={timeline}
                        score={score}
                        externalMetrics={liveMetrics}
                        isMasked={uiModifiers.mask_dashboard}
                        tempo={tempo}
                      />
                    )}
                    {activeApp === 'github' && (
                      <GitHubViewer
                        scenario={scenario}
                        onRootCauseIdentified={handleRootCauseIdentified}
                        rootCauseFound={rootCauseFound}
                      />
                    )}
                    {activeApp === 'sql' && (
                      <SQLConsole
                        scenarioId={scenario.id}
                      />
                    )}
                    {activeApp === 'terminal' && (
                      <Terminal
                        onCommand={handleTerminalCommand}
                        scenario={scenario}
                        incidentPhase={incidentPhase}
                        timeline={timeline}
                      />
                    )}
                    {activeApp === 'deploy' && (
                      <DeployConsole
                        onDeployAction={handleDeployAction}
                        currentMetrics={liveMetrics || scenario.metrics}
                        scenario={scenario}
                      />
                    )}
                    {activeApp === 'logs' && (
                      <LogsPanel
                        initialLines={sessionLogs}
                        scenario={scenario}
                        incidentPhase={incidentPhase}
                        timeline={timeline}
                      />
                    )}
                  </div>

                  {/* Right Segment: Incident Ops Chat-Bridge */}
                  <div className="w-[30%] h-full shrink-0 relative overflow-hidden rounded border border-slate-800 bg-[#11161d]">
                    <IncidentBridge
                      scenario={scenario}
                      scenarioId={scenario.id}
                      incidentPhase={incidentPhase}
                      timeline={timeline}
                      onChat={handleChatLogAppend}
                      rootCauseFound={rootCauseFound}
                      externalMessage={externalMessage}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Operations Taskbar Controller Footer */}
            <div className="h-11 bg-[#090d12] border-t border-slate-800 flex items-center px-4 gap-2 shrink-0 z-30 select-none">

              {/* Left Side App Toggles */}
              <div className="flex gap-1.5 mr-auto">
                {incomingRole !== 'comms' && incomingRole !== 'pr' && incomingRole !== 'security' && incomingRole !== 'cybersecurity' && (
                  <>
                    <button
                      onClick={() => setActiveApp('metrics')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'metrics' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                    >
                      <Activity size={12} /> TELEMETRY
                    </button>
                    <button
                      onClick={() => setActiveApp('github')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'github' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'} relative`}
                    >
                      <GitPullRequest size={12} /> GITHUB PR
                      {!rootCauseFound && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveApp('sql')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'sql' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                    >
                      <Database size={12} /> SQL DBA
                    </button>
                    <button
                      onClick={() => setActiveApp('terminal')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'terminal' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                    >
                      <TermIcon size={12} /> TERMINAL
                    </button>
                    <button
                      onClick={() => setActiveApp('deploy')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'deploy' ? 'bg-slate-800 text-slate-100 border-slate-700 font-bold text-red-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                    >
                      <Cpu size={12} /> DEPLOY
                    </button>
                  </>
                )}

                {/* PR default workspace triggers */}
                {(incomingRole === 'comms' || incomingRole === 'pr') && (
                  <button
                    onClick={() => setActiveApp('pr')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'pr' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                  >
                    <MessageSquare size={12} /> WORKSPACE
                  </button>
                )}

                {/* Security default workspace triggers */}
                {(incomingRole === 'security' || incomingRole === 'cybersecurity') && (
                  <button
                    onClick={() => setActiveApp('security')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'security' ? 'bg-red-950/40 text-red-400 border-red-900/40 font-bold' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                  >
                    <Shield size={12} className="text-red-400" /> SECURITY WORKSPACE
                  </button>
                )}

                <button
                  onClick={() => setActiveApp('logs')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${activeApp === 'logs' ? 'bg-slate-800 text-slate-100 border-slate-700' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                >
                  <FileText size={12} /> EVENTS
                </button>
              </div>

              {/* Right Side Telemetry Metrics & Tools */}
              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 uppercase tracking-wider text-[9px]">LIFECYCLE_STAGE:</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${incidentPhase === 'escalation' || incidentPhase === 'false_recovery' ? 'border-red-900 text-red-400 bg-red-950/30' : incidentPhase === 'mitigation' ? 'border-yellow-900 text-yellow-400 bg-yellow-950/30' : 'border-slate-800 text-slate-300 bg-slate-900/30'}`}>
                    {incidentPhase}
                  </span>
                </div>

                <div className="w-px h-4 bg-slate-800" />

                <div className="flex items-center gap-1">
                  <Shield size={12} className="text-slate-600" />
                  <span className="uppercase text-slate-400 font-bold">{incomingRole}</span>
                </div>

                <button
                  onClick={() => setShowWalkthrough(true)}
                  className="hover:bg-purple-950/40 text-purple-400 font-bold font-mono text-[9px] tracking-wide px-2.5 py-1 rounded border border-purple-900/30 hover:border-purple-800 transition-colors uppercase flex items-center gap-1 mr-1"
                >
                  ❓ Help & Walkthrough
                </button>

                <div className="w-px h-4 bg-slate-800" />

                <button
                  onClick={handleTerminateSimulationLoop}
                  className="hover:bg-red-950/40 text-red-400 font-bold font-mono text-[9px] tracking-wide px-2.5 py-1 rounded border border-red-900/30 hover:border-red-800 transition-colors uppercase"
                >
                  Terminate Execution
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DesktopEnvironment;