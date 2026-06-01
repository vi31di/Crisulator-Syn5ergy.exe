/**
 * PRWorkspace.jsx — GMAT-Style Stateful Crisis Simulation Workspace.
 * Unifies the PR front-end with the backend's adaptive state machine, allowing
 * the user to play through the full 5 GMAT phases with dynamic AI follow-ups.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Globe, 
  AlertTriangle, 
  TrendingDown, 
  Send, 
  ShieldAlert, 
  Users, 
  Sparkles, 
  Clock,
  Building,
  Briefcase
} from 'lucide-react';
import { api, incidentState, updateIncidentState } from '../data/api.js';

const PR_SCENARIOS_DATA = {
  boeing_737max_crisis: {
    executiveDms: [
      { sender: 'CEO', text: 'Should we recommend the FAA ground the fleet? It will cost billions.', time: '14:24' },
      { sender: 'Legal Counsel', text: 'Do not acknowledge MCAS role directly! That makes us open to lawsuits. Reframe as sensor noise.', time: '14:26' }
    ],
    initialTweets: [
      { handle: '@safety_first', text: "MCAS is literally pushing the nose down and pilots had 10 seconds to respond? This is a design crime! #737MAX #GroundTheFleet", likes: 1400, retweets: 820 },
      { handle: '@flyer_weekly', text: "FAA should have grounded these planes weeks ago! Why are they still flying in the US while Europe bans them? 😡 #Boycott737MAX", likes: 2100, retweets: 1100 },
      { handle: '@aviation_insider', text: "Leaked internal mails show Boeing calling MCAS 'safe' to avoid pilot simulator training costs. Absolute greed.", likes: 890, retweets: 430 }
    ],
    tickerTweets: [
      "Airlines around the world are canceling orders for the MAX. Massive financial hit incoming.",
      "Boeing engineers are reporting deep friction with senior managers over the MCAS sensor specifications.",
      "Aviation safety experts warn that standard angle-of-attack sensors are vulnerable to single-point-of-failure blocks.",
      "Angry travelers are checking booking engines to explicitly avoid 737 MAX flights."
    ]
  },
  ghc_crisis: {
    executiveDms: [
      { sender: 'CEO', text: 'We need to stand firm. Reframe the speech as a defense of high engineering standards. Apologizing will look weak to our investors.', time: '14:24' },
      { sender: 'PR Lead', text: 'The crowd at the convention center is extremely upset, and our own booth staff feel completely abandoned. We must express a transparent apology.', time: '14:26' }
    ],
    initialTweets: [
      { handle: '@tech_ally', text: 'Leaked GHC recruitment logs prove it was a total setup! Males routing to premium slots under female names? DISGUSTING! 😡 #BoycottGHC', likes: 1400, retweets: 820 },
      { handle: '@dei_advocate', text: 'Unbelievable. Top sponsors are already pulling out. We demand executive resignation immediately. #GHC26 #WomenInTech', likes: 2100, retweets: 1100 },
      { handle: '@journalist_jess', text: 'Standing outside GHC Hall A. Massive crowd forming. PR desk has been silent for 20 minutes. What are they hiding? #GHCLeaks', likes: 890, retweets: 430 }
    ],
    tickerTweets: [
      "Protesters are blocking booth entries inside the corporate pavilion.",
      "Joint sponsor ultimatum delivered. Corporate brands demand immediate engineering audits.",
      "Leaked slack channels show developers making fun of registration filters.",
      "Academic partners are suspending student referrals until GHC issues an official statement."
    ]
  },
  pepsi_ad_backlash: {
    executiveDms: [
      { sender: 'CEO', text: 'We spent millions on this spot. Can we reframe this as a call for peaceful dialogue?', time: '14:24' },
      { sender: 'Marketing VP', text: 'Pulling the ad admits defeat. Let is stand for 24 hours to let metrics stabilize.', time: '14:26' }
    ],
    initialTweets: [
      { handle: '@culture_now', text: "Using a soda can to solve police brutality and systemic racism? Who approved this tone-deaf mess? #PepsiAd", likes: 1400, retweets: 820 },
      { handle: '@protest_lens', text: "This is the most co-opted, commercialized garbage I have ever seen. Disrespectful to actual movements. #Shame", likes: 2100, retweets: 1100 },
      { handle: '@brand_fail', text: "Pepsi thought a model walking through a crowd with a beverage could heal the world. Peak corporate delusion.", likes: 890, retweets: 430 }
    ],
    tickerTweets: [
      "Boycott Pepsi hashtags are trending #1 worldwide.",
      "Retailers in major cities report customers moving Pepsi cans to the back of the shelves.",
      "Marketing influencers are breaking down the ad frame-by-frame as a case study in disaster.",
      "Celebrities are deleting sponsor posts associated with the brand."
    ]
  },
  united_airlines_crisis: {
    executiveDms: [
      { sender: 'CEO', text: "We need to stand firm. Reframe the speech as a defense of high engineering standards. Apologizing will look weak to our investors.", time: '14:24' },
      { sender: 'PR Lead', text: "The crowd at the convention center is extremely upset, and our own booth staff feel completely abandoned. We must express a transparent apology.", time: '14:26' }
    ],
    initialTweets: [
      { handle: '@brand_analyst', text: "Joint sponsor ultimatum delivered. Corporate brands demand immediate engineering audits. #BoycottUnited", likes: 1300, retweets: 780 },
      { handle: '@crisis_watcher', text: "Protesters are blocking booth entries inside the corporate pavilion. Video has reached 97M views. #BoycottUnited", likes: 1400, retweets: 820 },
      { handle: '@industry_insider', text: "A video of airport security violently dragging a concussed passenger from an overbooked flight. Stock is in free-fall.", likes: 890, retweets: 430 }
    ],
    tickerTweets: [
      "Boycott United airlines passenger removal is trending #1 worldwide.",
      "Shareholders are dumping stock, causing a 4% plunge in value within hours.",
      "Aviation regulators announce immediate investigation into boarding policies.",
      "Manager demands instant updates and a comprehensive mitigation apology."
    ]
  },
  volkswagen_dieselgate: {
    executiveDms: [
      { sender: 'CEO', text: "We need to stand firm. Apologizing will look weak to our investors. Reframe the emissions notice as a sensor-calibration outlier.", time: '14:24' },
      { sender: 'Legal Advisor', text: "The EPA has extracted the defeat-device code directly. Denying intentional cheating will trigger criminal charges. We must admit fault.", time: '14:26' }
    ],
    initialTweets: [
      { handle: '@diesel_gate', text: "VW intentionally coded clean diesel engines to cheat cleaner EPA tests? Institutional conspiracy! 🤮 #Dieselgate #BoycottVW", likes: 14000, retweets: 8200 },
      { handle: '@green_energy', text: "EPA issues notice of violation. Stock drops 20% in single day. Global sales threat is massive. #BoycottVW", likes: 21000, retweets: 11000 },
      { handle: '@investor_view', text: "VW CEO is facing immediate pressure to resign. Criminal fraud investigations opened globally.", likes: 8900, retweets: 4300 }
    ],
    tickerTweets: [
      "EPA Notice of Violation completely halts sales of VW clean diesel engines.",
      "Volkswagen stock plunges 20% in largest daily drop in company history.",
      "German and US justice departments launch coordinated criminal fraud investigations.",
      "Class action lawsuits filed on behalf of millions of clean diesel car owners."
    ]
  }
};

const DEFAULT_PR_DATA = PR_SCENARIOS_DATA.ghc_crisis;

const PRWorkspace = ({ scenario, incidentPhase, timeline, onCommand, slaCountdown = 480, onEndSession }) => {
  const [response, setResponse] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionEndedReason, setSessionEndedReason] = useState(null); // 'trust' | 'outrage' | 'legal' | 'timeout'

  const scenarioId = scenario?.id || 'ghc_crisis';
  const prData = PR_SCENARIOS_DATA[scenarioId] || DEFAULT_PR_DATA;

  // Stateful GMAT Trackers
  const [activeNodeId, setActiveNodeId] = useState('');
  const [currentPhase, setCurrentPhase] = useState('detection');
  const [difficulty, setDifficulty] = useState(1);
  const [score, setScore] = useState(0);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [completedActions, setCompletedActions] = useState([]);
  const [phaseOptions, setPhaseOptions] = useState([]);

  const [activeQuestion, setActiveQuestion] = useState('');
  const [activeOutlet, setActiveOutlet] = useState('Reuters');
  const [messages, setMessages] = useState([
    { type: 'system', text: 'PR COMMUNICATIONS TERMINAL ONBOARDED.' }
  ]);

  const [sentiment, setSentiment] = useState({
    trust: 45,
    mediaHostility: 75,
    legalRisk: 30
  });

  const [executiveDms, setExecutiveDms] = useState(prData.executiveDms);
  const [tweets, setTweets] = useState(prData.initialTweets);
  const [sponsorStatus, setSponsorStatus] = useState("Monitoring PR/Comms Peering routes...");

  const endRef = useRef(null);

  const formatTimeLeft = (seconds) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Monitor reputation bars and timer for Session Ended state
  useEffect(() => {
    if (!sessionActive || isComplete || sessionEndedReason) return;

    if (sentiment.trust >= 100) {
      setSessionEndedReason('trust');
    } else if (sentiment.mediaHostility >= 100) {
      setSessionEndedReason('outrage');
    } else if (sentiment.legalRisk >= 100) {
      setSessionEndedReason('legal');
    } else if (slaCountdown <= 0) {
      setSessionEndedReason('timeout');
    }
  }, [sentiment, slaCountdown, sessionActive, isComplete, sessionEndedReason]);

  const handleGetReport = () => {
    setSessionActive(false);
    setIsComplete(true);
    if (onEndSession) {
      onEndSession(score);
    }
  };

  // Load the initial GMAT session from the stateful backend
  useEffect(() => {
    const initializeGmatSession = async () => {
      try {
        const startData = await api.startSession(scenarioId);

        setActiveNodeId(startData.node_id);
        setCurrentPhase(startData.phase || 'detection');
        setDifficulty(startData.difficulty || 1);
        setScore(startData.score || 0);
        setActiveQuestion(startData.question || (scenario?.brief || "Incident started. What is your statement?"));
        
        if (startData.options && startData.options.length > 0) {
          setPhaseOptions(startData.options);
        } else {
          setPhaseOptions([]);
        }

        setSessionActive(true);

        setMessages([
          { type: 'system', text: `PR COMMUNICATIONS TERMINAL ONBOARDED FOR: ${scenario?.title?.toUpperCase()}` },
          { type: 'journalist', source: 'Reuters', text: startData.question }
        ]);

      } catch (err) {
        console.warn("Failed to initialize stateful PR session, falling back:", err);
        setActiveQuestion(scenario?.brief || "The press is lining up. What is your statement?");
        setSessionActive(true);
      }
    };

    initializeGmatSession();
  }, [scenarioId, scenario?.title, scenario?.brief]);

  // Periodic Outrage Social Ticker Updates
  useEffect(() => {
    const handleTicker = setInterval(() => {
      const handles = ['@crisis_watcher', '@brand_analyst', '@news_wire', '@public_advocate', '@industry_insider'];
      const topics = prData.tickerTweets || DEFAULT_PR_DATA.tickerTweets;
      
      const randomIdx = Math.floor(Math.random() * handles.length);
      const newTweet = {
        handle: handles[randomIdx],
        text: topics[randomIdx % topics.length],
        likes: Math.floor(Math.random() * 500) + 100,
        retweets: Math.floor(Math.random() * 200) + 50
      };
      
      setTweets(t => [newTweet, ...t.slice(0, 5)]);
    }, 9000);

    return () => clearInterval(handleTicker);
  }, [scenarioId, prData]);

  // Retrieve dynamic phase options mapping dynamically per GMAT phase and outcome
  const getDynamicPhaseOptions = () => {
    const matrix = {
      united_airlines_crisis: {
        detection: [
          { label: "Draft Holding Statement", command: "hold statement", action: "Draft an official holding statement to acknowledge viral video.", risk: "Low Risk", hint: "RECOMMENDED: Acknowledges concern while legal gathers facts." },
          { label: "Stand by Wording", command: "Stand by the 're-accommodate' statement", action: "Stand by the initial statement apologizing for re-accommodating passenger.", risk: "High Risk", hint: "WARNING: High risk of escalating media outrage and stock plunge." }
        ],
        escalation: [
          { label: "Issue Sincere Apology", command: "Issue profound apology", action: "Issue a profound and direct public apology from the CEO.", risk: "Low Risk", hint: "RECOMMENDED: Essential first-step to stabilize public sentiment." },
          { label: "Blame Aviation Police", command: "Blame aviation police", action: "Shift the responsibility to airport aviation police forces.", risk: "High Risk", hint: "WARNING: Seen as corporate blame shifting; accelerates outrage." }
        ],
        mitigation: [
          { label: "Announce Policy Reform", command: "Announce policy change on overbooking", action: "Announce dynamic overbooking review and ticket reform.", risk: "Low Risk", hint: "RECOMMENDED: Resolves structural root cause to rebuild trust." },
          { label: "Fire the CEO", command: "Fire the CEO immediately", action: "Request board of directors to dismiss the CEO.", risk: "Medium Risk", hint: "Balances severe governance changes with legal concerns." }
        ],
        recovery: [
          { label: "Announce Policy Reform", command: "Announce policy change on overbooking", action: "Announce dynamic overbooking review and ticket reform.", risk: "Low Risk", hint: "RECOMMENDED: Establishes a permanent customer first policy." },
          { label: "Cooperate with FAA", command: "cooperate with regulators", action: "Coordinate fully with federal aviation regulators.", risk: "Low Risk", hint: "RECOMMENDED: Ensures operational compliance and passenger safety." }
        ]
      },
      volkswagen_dieselgate: {
        detection: [
          { label: "Cooperate with EPA", command: "cooperate_with_regulators --meeting 'Joint statement with EPA'", action: "Cooperate with clean air regulators and hold a joint statement.", risk: "Low Risk", hint: "RECOMMENDED: Secures legal transparency and regulatory alignment." },
          { label: "Deny Deception Notice", command: "deny_intentional_cheating --statement 'This was an isolated mistake.'", action: "Formally deny Notice of Violation clean emissions claims.", risk: "High Risk", hint: "WARNING: Highly volatile; will double regulatory penalties." }
        ],
        escalation: [
          { label: "Admit Fault Fully", command: "issue_press_release --message 'We admit fault and are taking full responsibility.'", action: "Release public statement admitting defeat-device code use.", risk: "Low Risk", hint: "RECOMMENDED: Necessary to prevent wider criminal fraud charges." },
          { label: "Blame Rogue Engineers", command: "blame_engineers --names 'Rogue team members'", action: "Blame specific developers for cheating software logic.", risk: "High Risk", hint: "WARNING: Deflects responsibility; triggers severe compliance backlash." }
        ],
        mitigation: [
          { label: "Suspend Executives", command: "suspend_executives --names 'CEO, CTO'", action: "Immediately suspend CEO and engineering leadership.", risk: "Medium Risk", hint: "Establishes institutional accountability before board actions." },
          { label: "Launch Recall Program", command: "launch_recall_program --models 'affected diesel cars'", action: "Begin a global clean emissions recall repair program.", risk: "Low Risk", hint: "RECOMMENDED: Active product remediation to restore consumer confidence." }
        ],
        recovery: [
          { label: "Launch Recall Program", command: "launch_recall_program --models 'affected diesel cars'", action: "Begin a global clean emissions recall repair program.", risk: "Low Risk", hint: "RECOMMENDED: Resolves mechanical compliance at scale." },
          { label: "Create Compensation Fund", command: "create_compensation_fund --amount 10B", action: "Establish structured settlement fund for diesel owners.", risk: "Low Risk", hint: "RECOMMENDED: Demonstrates financial remediation commitment." }
        ]
      },
      ghc_crisis: {
        detection: [
          { label: "Acknowledge Flaws", command: "pr_intent: Apologize and Reassure", action: "Draft a holding statement acknowledging registration anomalies.", risk: "Low Risk", hint: "RECOMMENDED: Calms community frustration during system audit." },
          { label: "Defend GHC Policy", command: "pr_intent: Defend meritocracy", action: "Stand firm on GHC standard registration filters.", risk: "High Risk", hint: "WARNING: High risk of immediate corporate sponsor withdrawal." }
        ],
        escalation: [
          { label: "Apologize Sincerely", command: "pr_intent: Apologize and Reassure", action: "Release CEO sincere apology to all participants.", risk: "Low Risk", hint: "RECOMMENDED: Essential to retain attendee and academic trust." },
          { label: "Blame Attendee Methods", command: "Blame individual attendees for filtering bypass", action: "Publicly call out male attendees bypassing registration filters.", risk: "High Risk", hint: "WARNING: Defensive shift; seen as host failure deflection." }
        ],
        mitigation: [
          { label: "Announce System Audit", command: "pr_intent: Launch Diversity Audit", action: "Announce deep engineering and filtering systems audit.", risk: "Low Risk", hint: "RECOMMENDED: Concrete commitment to secure GHC integrity." },
          { label: "Brief CEO & Board", command: "brief ceo", action: "Provide a 5-sentence briefing note to CEO and directors.", risk: "Medium Risk", hint: "Aligns leadership ahead of media conferences." }
        ],
        recovery: [
          { label: "Coach Booth Staff", command: "pr_intent: Coach Booth Staff", action: "Provide direct coaching guidelines for booth coordinators.", risk: "Low Risk", hint: "RECOMMENDED: Supports physical booth staff under fire." },
          { label: "Legal Alignment", command: "coordinate legal", action: "Align statement details with DEI council counsel.", risk: "Low Risk", hint: "RECOMMENDED: Secures legal compliance for future sessions." }
        ]
      }
    };

    // Get current scenario matrix
    const scenarioMatrix = matrix[scenarioId];
    if (!scenarioMatrix) {
      // Fallback: Dynamically generate options from scenario possibleActions
      const actions = scenario?.possibleActions || scenario?.scoring?.winning_actions || [];
      const badActions = scenario?.scoring?.bad_actions || scenario?.wrongActions || [];
      const criticalActions = scenario?.scoring?.critical_actions || [];

      return (Array.isArray(actions) ? actions : []).map(act => {
        const actStr = typeof act === 'string' ? act : String(act || '');
        const lowerAct = actStr.toLowerCase();
        let risk = "Medium Risk";
        let riskColor = "border-yellow-500/20 text-yellow-400 bg-yellow-500/10";
        let hoverBorder = "group-hover:border-yellow-500/60";
        let hint = "Balances transparency with legal constraints.";

        const isBad = (Array.isArray(badActions) ? badActions : []).some(bad => {
          const badStr = typeof bad === 'string' ? bad : String(bad || '');
          const firstWord = badStr.split(' ')[0] || '';
          return firstWord ? actStr.includes(firstWord) : false;
        }) || lowerAct.includes("blame") || lowerAct.includes("defend") || lowerAct.includes("deny");

        const isCritical = (Array.isArray(criticalActions) ? criticalActions : []).some(crit => {
          const critStr = typeof crit === 'string' ? crit : String(crit || '');
          const firstWord = critStr.split(' ')[0] || '';
          return firstWord ? actStr.includes(firstWord) : false;
        }) || lowerAct.includes("apologize") || lowerAct.includes("cooperate");

        if (isBad) {
          risk = "High Risk";
          riskColor = "border-red-500/20 text-red-400 bg-red-500/10";
          hoverBorder = "group-hover:border-red-500/60";
          hint = "WARNING: Potentially increases liability or public outrage.";
        } else if (isCritical) {
          risk = "Low Risk";
          riskColor = "border-green-500/20 text-green-400 bg-green-500/10";
          hoverBorder = "group-hover:border-green-500/60";
          hint = "RECOMMENDED: Focuses on apologies, transparency, and restoration.";
        }

        let cleanLabel = act.split("--")[0].replace(/_/g, ' ').replace(/-/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());

        return {
          label: cleanLabel,
          command: act,
          action: act,
          risk,
          riskColor,
          hoverBorder,
          hint
        };
      });
    }

    // Load options for the active phase (falls back to detection if phase is unknown)
    const phaseKey = currentPhase?.toLowerCase() || 'detection';
    const originalPhaseOptions = scenarioMatrix[phaseKey] || scenarioMatrix.detection || [];

    // Filter out already executed options to keep them dynamic
    let phaseOptions = Array.isArray(originalPhaseOptions) ? originalPhaseOptions.filter(opt => opt && opt.command && Array.isArray(completedActions) ? !completedActions.includes(opt.command) : true) : [];

    // Guarantee that at least 2 options are ALWAYS visible in the deck
    if (Array.isArray(phaseOptions) && phaseOptions.length < 2) {
      const remainingUncompleted = Array.isArray(phaseOptions) ? phaseOptions.map(o => o?.command).filter(Boolean) : [];
      const backfills = Array.isArray(originalPhaseOptions) ? originalPhaseOptions.filter(o => o && o.command && Array.isArray(remainingUncompleted) ? !remainingUncompleted.includes(o.command) : true) : [];
      phaseOptions = [...phaseOptions, ...backfills].slice(0, 2);
    }

    // Dynamic Outcome override additions
    if (lastOutcome === 'wrong') {
      const emergencyCard = {
        label: "Emergency Damage Retraction",
        command: scenarioId === 'volkswagen_dieselgate' 
          ? "issue_press_release --message 'We accept full responsibility and are cooperating fully with authorities'"
          : "Issue profound apology",
        action: "Retract previous statements and release a sincere apology to control damage.",
        risk: "Low Risk",
        riskColor: "border-green-500/20 text-green-400 bg-green-500/10",
        hoverBorder: "group-hover:border-green-500/60",
        hint: "CRITICAL: Deploy immediate apology to counteract negative outcome."
      };
      // Insert at index 0 of options so it draws high-priority focus!
      if (Array.isArray(completedActions) && emergencyCard && emergencyCard.command && !completedActions.includes(emergencyCard.command)) {
        phaseOptions = [emergencyCard, ...(Array.isArray(phaseOptions) ? phaseOptions.filter(o => o && o.command !== emergencyCard.command) : [])];
      }
    }

    // Final mapping to enrich visual tailwind attributes
    return phaseOptions.map(opt => {
      const isBad = opt.risk === "High Risk";
      const isLow = opt.risk === "Low Risk";
      return {
        ...opt,
        riskColor: isBad 
          ? "border-red-500/20 text-red-400 bg-red-500/10" 
          : isLow 
            ? "border-green-500/20 text-green-400 bg-green-500/10" 
            : "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
        hoverBorder: isBad 
          ? "group-hover:border-red-500/60" 
          : isLow 
            ? "group-hover:border-green-500/60" 
            : "group-hover:border-yellow-500/60"
      };
    });
  };

  const enrichedOptions = (phaseOptions.length > 0 ? phaseOptions : getDynamicPhaseOptions()).map(opt => {
    const isBad = opt.risk === "High Risk" || opt.risk === "High";
    const isLow = opt.risk === "Low Risk" || opt.risk === "Low";
    return {
      ...opt,
      riskColor: isBad 
        ? "border-red-500/20 text-red-400 bg-red-500/10" 
        : isLow 
          ? "border-green-500/20 text-green-400 bg-green-500/10" 
          : "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
      hoverBorder: isBad 
        ? "group-hover:border-red-500/60" 
        : isLow 
          ? "group-hover:border-green-500/60" 
          : "group-hover:border-yellow-500/60"
    };
  });

  const handleSend = async (intentCommand = null) => {
    if (isEvaluating || isComplete) return;

    const cmd = intentCommand || `pr_custom: ${response.trim()}`;
    const displayText = intentCommand 
      ? `[OFFICIAL DECISION: ${intentCommand}]` 
      : `[CUSTOM PRESS RELEASE]: "${response.trim()}"`;

    setIsEvaluating(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'You', content: displayText, type: 'chat', time: timestamp },
      { id: Date.now() + 1, sender: 'System', content: 'Evaluating public sentiment shifts...', type: 'system' }
    ]);
    setResponse('');

    try {
      const result = await onCommand(cmd);

      // Remove the evaluation system log and append the dynamic character-driven reaction
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== 'Evaluating public sentiment shifts...');
        const updated = [...filtered];

        if (result.agent_reaction) {
          updated.push({
            id: Date.now(),
            sender: `${result.agent_reaction.agent} (${result.agent_reaction.role})`,
            content: result.agent_reaction.message.replace(/^\[.*?\]\s*/, ''), // Strip redundant [Role] prefix
            type: 'chat',
            time: timestamp
          });
        } else {
          updated.push({
            id: Date.now(),
            sender: 'PR Lead',
            content: result.feedback || "We have logged this action and are reviewing our operational response posture.",
            type: 'chat',
            time: timestamp
          });
        }
        return updated;
      });

      // Synchronize GMAT state machine parameters from backend
      if (result.next_node_id) {
        setActiveNodeId(result.next_node_id);
      }
      if (result.next_phase) {
        setCurrentPhase(result.next_phase);
      }
      if (result.next_difficulty) {
        setDifficulty(result.next_difficulty);
      }
      if (typeof result.score === 'number') {
        setScore(result.score);
      }

      if (result.options && result.options.length > 0) {
        setPhaseOptions(result.options);
      } else {
        setPhaseOptions([]);
      }

      // Check complete condition
      if (result.is_complete) {
        setIsComplete(true);
        return;
      }

      // Append next dynamic question generated by the LLM Game Master
      if (result.next_question) {
        setActiveQuestion(result.next_question);
        const outlets = ["WSJ", "Bloomberg", "TechCrunch", "Wired", "Reuters", "Associated Press"];
        setActiveOutlet(outlets[Math.floor(Math.random() * outlets.length)]);
        
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { id: Date.now(), sender: activeOutlet, content: result.next_question, type: 'chat', time: timestamp }
          ]);
        }, 1000);
      }

      // Update local visual metric bars based on the backend evaluation
      if (result.outcome === 'good') {
        setSentiment(s => ({
          trust: Math.min(100, s.trust + 15),
          mediaHostility: Math.max(0, s.mediaHostility - 10),
          legalRisk: s.legalRisk
        }));
        setSponsorStatus('STABILIZING: Stakeholders appreciate the transparency. Outrage cooling down.');
      } else {
        setSentiment(s => ({
          trust: Math.max(0, s.trust - 15),
          mediaHostility: Math.min(100, s.mediaHostility + 15),
          legalRisk: Math.min(100, s.legalRisk + 15)
        }));
        setSponsorStatus('CRITICAL ESCALATION: Continued pushback triggers protests and sponsor freezes.');
      }

      // Update dynamic options deck filters
      setLastOutcome(result.verdict || (result.outcome === 'good' ? 'correct' : 'wrong'));
      if (intentCommand) {
        setCompletedActions(prev => [...prev, intentCommand]);
      }

    } catch (err) {
      console.error("GMAT sandbox execution failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const messagesEndRef = useRef(null);

  return (
    <div className="flex w-full h-full gap-3 text-slate-300 font-sans p-2 overflow-hidden relative bg-[#09080e]">
      
      {/* Session Ended Premium Frosted Overlay Modal */}
      {sessionEndedReason && (
        <div className="absolute inset-0 bg-[#09080ebf]/95 backdrop-blur-md z-50 flex flex-col justify-center items-center text-center p-8 space-y-6 rounded-2xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 rounded-full bg-purple-950/20 border border-purple-500/30 text-purple-400"
          >
            <ShieldAlert size={48} className="animate-pulse" />
          </motion.div>
          
          <h2 className="text-2xl font-black tracking-tight text-white font-mono uppercase">
            {sessionEndedReason === 'trust' ? 'Brand stabilized successfully' : 'Crisis Response Terminated'}
          </h2>
          
          <p className="text-xs text-slate-400 max-w-md leading-relaxed font-sans">
            {sessionEndedReason === 'trust' && "Success! Public Trust has reached 100%. Media hostility has normalized, corporate sponsors are locked in, and the brand is fully secure."}
            {sessionEndedReason === 'outrage' && "Critical Outbreak! Public Outrage has spiked to 100%. Headquarters is blockaded by protestors and corporate sponsors have suspended contracts."}
            {sessionEndedReason === 'legal' && "Regulatory Suspension! Legal Risk has spiked to 100%. General Counsel advises complete silence under active SEC fraud subpoena notice."}
            {sessionEndedReason === 'timeout' && "SLA Response Window Expired! Mitigation timeline exceeded before public sentiment stabilized."}
          </p>

          <div className="grid grid-cols-4 gap-4 w-full max-w-lg bg-[#120d1c] border border-purple-950/60 p-4 rounded-xl font-mono text-[9px] text-slate-400 select-none">
            <div>
              <div>Public Trust</div>
              <div className={`text-xs font-bold mt-1 ${sessionEndedReason === 'trust' ? 'text-green-400' : 'text-slate-200'}`}>{sentiment.trust}%</div>
            </div>
            <div>
              <div>Outrage Index</div>
              <div className={`text-xs font-bold mt-1 ${sessionEndedReason === 'outrage' ? 'text-red-400' : 'text-slate-200'}`}>{sentiment.mediaHostility}%</div>
            </div>
            <div>
              <div>Legal Risk</div>
              <div className={`text-xs font-bold mt-1 ${sessionEndedReason === 'legal' ? 'text-red-400' : 'text-slate-200'}`}>{sentiment.legalRisk}%</div>
            </div>
            <div>
              <div>Final Score</div>
              <div className="text-xs font-bold mt-1 text-cyan-400">{score} / 100</div>
            </div>
          </div>

          <button
            onClick={handleGetReport}
            className="px-6 py-3.5 rounded-lg border border-purple-500 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all hover:scale-105 active:scale-95 animate-bounce cursor-pointer"
          >
            Get Retrospective Report
          </button>
        </div>
      )}
      
      {/* Left Column: Social Outrage Feed */}
      <div className="w-[28%] bg-[#0c0a12] border border-purple-950/40 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="bg-[#120f1c] border-b border-purple-950/40 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="text-purple-400 animate-spin" size={14} />
            <span className="font-bold text-xs uppercase tracking-wider text-purple-300 font-mono">
              SOCIAL OUTRAGE FEED
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-950/50 text-[9px] text-red-400 border border-red-900/40 font-mono font-semibold">
            VIRAL LIVE
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-ops">
          {tweets.map((tw, i) => (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={i} 
              className="p-3 rounded-xl border border-purple-950/20 bg-[#120d1c]/60 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-[9px] text-slate-400 select-none">
                <span className="font-bold text-purple-300 font-mono">{tw.handle}</span>
                <span className="text-red-400">🔥 viral threat</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300 mt-1.5 font-sans">
                {tw.text}
              </p>
              <div className="flex gap-4 mt-2 text-[9px] text-slate-500 font-mono select-none">
                <span>🔄 {tw.retweets} RTs</span>
                <span>❤️ {tw.likes} Likes</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Center Column: progressive gameplay */}
      {isComplete ? (
        <div className="flex-1 bg-[#0c0a12] border border-purple-950/40 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 rounded-full bg-purple-950/20 border border-purple-500/30 text-purple-400"
          >
            <ShieldAlert size={48} className="animate-pulse" />
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono uppercase">Crisis Playbook Complete</h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            The public relations response has been successfully cataloged. All statements have been broadcast to regional news agencies and sponsor channels.
          </p>
          <div className="grid grid-cols-3 gap-4 w-full max-w-md bg-[#120d1c] border border-purple-950/60 p-4 rounded-xl">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Public Trust</div>
              <div className="text-lg font-bold text-purple-400 mt-1">{sentiment.trust}%</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Outrage Index</div>
              <div className="text-lg font-bold text-pink-500 mt-1">{sentiment.mediaHostility}%</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Legal Risk</div>
              <div className="text-lg font-bold text-indigo-400 mt-1">{sentiment.legalRisk}%</div>
            </div>
          </div>
          <button
            onClick={handleGetReport}
            className="px-6 py-3 rounded-lg border border-purple-500 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer mt-4"
          >
            Get Retrospective Report
          </button>
        </div>
      ) : (
        <div className="flex-1 bg-[#0c0a12] border border-purple-950/40 rounded-2xl overflow-hidden flex flex-col relative">
          {/* Sponsor Warning Banner */}
          <div className="bg-purple-950/25 border-b border-purple-900/40 px-4 py-2 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
              <Building size={14} className="text-purple-400 animate-pulse" />
              <marquee className="text-[10px] uppercase font-bold tracking-wider text-purple-200 w-80">
                {sponsorStatus}
              </marquee>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-purple-400">
              <Clock size={12} className="text-purple-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider">Crisis Room Active — {formatTimeLeft(slaCountdown)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-ops">
            
            {/* Active Reporter Question Tracker */}
            <div className="p-3 bg-purple-950/10 border border-purple-900/30 rounded-xl relative">
              <span className="absolute top-0 right-0 p-1 bg-purple-500/20 text-purple-400 font-mono text-[8px] font-bold uppercase tracking-widest rounded-bl-lg select-none">
                {activeOutlet} Inquiry
              </span>
              <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider mb-1.5 flex justify-between items-center select-none">
                <span>Adaptive GMAT Phase — {currentPhase?.toUpperCase()}</span>
                <span className="text-red-400 tracking-wider">AWAITING DECISION</span>
              </div>
              <div className="text-xs text-slate-200 font-sans leading-relaxed">
                "{activeQuestion}"
              </div>
            </div>

            {/* Dialog Log */}
            <div className="border border-purple-950/30 rounded-xl bg-black/40 p-3 space-y-3 h-52 overflow-y-auto scrollbar-ops">
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono border-b border-purple-950/30 pb-1.5 select-none">
                Press Release Timeline Log
              </div>
              {messages.map((msg, i) => (
                <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i} className={`p-2.5 rounded-lg border ${
                  msg.type === 'system' ? 'bg-[#120d1c]/60 border-purple-950/30 text-purple-400/60 text-[10px] font-mono' :
                  msg.sender === 'You' ? 'bg-purple-950/30 border-purple-500/30 text-purple-200' :
                  'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}>
                  {msg.source && <div className={`text-[10px] font-bold mb-0.5 font-mono text-slate-400`}>{msg.source}</div>}
                  <div className="text-xs leading-relaxed font-sans">{msg.content || msg.text}</div>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Strategic Choices Buttons */}
            <div className="space-y-2 select-none">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold flex justify-between items-center">
                <span>Phase Options</span>
                <span className="text-purple-400 text-[8px] border border-purple-900/50 bg-purple-950/20 px-1.5 py-0.5 rounded font-mono">
                  ACTIVE DECK
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {enrichedOptions.map((intent, idx) => (
                  <button 
                    key={idx}
                    disabled={isEvaluating}
                    onClick={() => handleSend(intent.command)}
                    className={`p-3 bg-[#110e1a] hover:bg-[#161224] border border-purple-950/60 ${intent.hoverBorder} rounded-xl text-left transition-all group disabled:opacity-40 flex flex-col justify-between min-h-[105px] shadow-sm`}
                  >
                    <div className="w-full">
                      <div className="font-bold text-slate-205 text-[11px] font-mono group-hover:text-purple-400 transition-colors flex items-center justify-between">
                        <span>{intent.label}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${intent.riskColor}`}>{intent.risk}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-sans line-clamp-2 leading-relaxed">
                        {intent.action}
                      </div>
                    </div>
                    
                    <div className="text-[8px] text-slate-500 italic font-sans border-t border-purple-950/20 pt-1.5 mt-2 w-full group-hover:text-slate-300 transition-colors">
                      {intent.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Composer */}
            <div className="pt-2">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-2 select-none">
                Draft Custom Response to {activeOutlet}
              </div>
              <div className="relative">
                <textarea 
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  disabled={isEvaluating}
                  placeholder={prData.customPlaceholder || "Draft your custom response statement..."}
                  className="w-full bg-[#110e1b] border border-purple-950 rounded-xl p-3 text-xs resize-none h-20 focus:outline-none focus:border-purple-800 transition-all font-sans focus:ring-0 text-slate-200 placeholder-purple-900"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!response.trim() || isEvaluating}
                  className="absolute bottom-3 right-3 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-40 transition-all hover:scale-105"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Right Column: Sentiment & Interactive Executive DMs */}
      <div className="w-[300px] bg-[#0c0a12] border border-purple-950/40 rounded-2xl flex flex-col overflow-hidden relative select-none">
        <div className="bg-[#120f1c] border-b border-purple-950/40 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-purple-400" size={14} />
            <span className="font-bold text-xs uppercase tracking-wider text-purple-300 font-mono">
              REPUTATION INDEX
            </span>
          </div>
        </div>
        
        <div className="p-4 space-y-4 flex-1 flex flex-col justify-between overflow-hidden">
          {/* Sentiment bars */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-end mb-1 font-mono text-[9px]">
                <span className="font-bold text-slate-400 uppercase">Public Trust</span>
                <span className={`font-bold text-xs ${sentiment.trust < 30 ? 'text-red-400' : 'text-purple-400'}`}>{sentiment.trust}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-purple-950/40">
                 <div className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400 transition-all duration-300" style={{ width: `${sentiment.trust}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1 font-mono text-[9px]">
                <span className="font-bold text-slate-400 uppercase">🔥 Public Outrage Index</span>
                <span className={`font-bold text-xs ${sentiment.mediaHostility > 70 ? 'text-red-400' : 'text-amber-400'}`}>{sentiment.mediaHostility}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-purple-950/40">
                 <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300" style={{ width: `${sentiment.mediaHostility}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1 font-mono text-[9px]">
                <span className="font-bold text-slate-400 uppercase">Legal Risk Index</span>
                <span className="font-bold text-xs text-purple-400">{sentiment.legalRisk}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-purple-950/40">
                 <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300" style={{ width: `${sentiment.legalRisk}%` }} />
              </div>
            </div>
          </div>

          {/* Interactive DMs scroll */}
          <div className="flex-1 flex flex-col justify-end overflow-hidden pt-4 border-t border-purple-950/30">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold mb-2">
              <Users size={10} className="text-purple-400" /> Active Executive Chats
            </div>
            <div className="space-y-2 overflow-y-auto max-h-48 pr-1 scrollbar-ops">
              {executiveDms.map((dm, i) => (
                <div key={i} className="bg-[#120d1c] p-2 rounded-lg border border-purple-950/60 font-sans text-[11px] leading-relaxed">
                  <div className="flex justify-between items-center text-[9px] font-mono text-purple-300 mb-0.5 font-bold">
                    <span>{dm.sender}</span>
                    <span className="text-[8px] text-slate-500 font-normal">{dm.time}</span>
                  </div>
                  <span className="text-slate-300">{dm.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default PRWorkspace;