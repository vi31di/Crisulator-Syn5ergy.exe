/**
 * Syn5ergy v3 - Incident Response Terminal Console
 * Simulates a realistic production environment shell interface.
 * Implements command history, latency simulation, and confirmation prompts.
 */
import React, { useState, useEffect, useRef } from 'react';
import { api, incidentState } from '../data/api.js';

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Interactive Help Component rendering
const InteractiveHelp = () => {
  return (
    <div className="bg-[#0f171e] border border-slate-800 p-3 rounded text-slate-300 my-2">
      <div className="text-ops-glow font-bold mb-2 pb-2 border-b border-slate-800/50">OPERATIONAL MANUAL</div>
      <div className="grid grid-cols-2 gap-4">
        
        <div className="group relative">
          <div className="font-mono text-cyan-400">kubectl get pods</div>
          <div className="text-[10px] text-slate-500">Diagnostic</div>
          {/* Hover tooltip */}
          <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-slate-900 border border-slate-700 rounded shadow-xl -mt-1 -ml-2 text-xs">
            <div className="font-bold text-white mb-1">kubectl get pods</div>
            <div className="text-slate-400 mb-2">Check active health of orchestration pods. Essential first-step for any backend outage.</div>
            <div className="text-green-400">Risk: Low</div>
          </div>
        </div>

        <div className="group relative">
          <div className="font-mono text-red-400">rollback [service]</div>
          <div className="text-[10px] text-slate-500">Recovery</div>
          <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-slate-900 border border-red-900/50 rounded shadow-xl -mt-1 -ml-2 text-xs">
            <div className="font-bold text-red-400 mb-1">rollback</div>
            <div className="text-slate-400 mb-2">Reverts a deployment to the previous stable revision.</div>
            <div className="text-red-400 font-bold">Risk: High (Requires Confirmation)</div>
            <div className="text-slate-500 italic mt-1">Note: Can cause stale cache mismatch if DB schemas were updated.</div>
          </div>
        </div>

        <div className="group relative">
          <div className="font-mono text-yellow-400">systemctl restart</div>
          <div className="text-[10px] text-slate-500">Mitigation</div>
          <div className="absolute hidden group-hover:block z-10 w-64 p-3 bg-slate-900 border border-yellow-900/50 rounded shadow-xl -mt-1 -ml-2 text-xs">
            <div className="font-bold text-yellow-400 mb-1">systemctl restart</div>
            <div className="text-slate-400 mb-2">Hard reboots a system daemon. Will drop all active connections.</div>
            <div className="text-yellow-400 font-bold">Risk: Medium</div>
          </div>
        </div>

        <div className="group relative">
          <div className="font-mono text-cyan-400">tail -f logs</div>
          <div className="text-[10px] text-slate-500">Diagnostic</div>
        </div>

      </div>
    </div>
  );
};

const DANGEROUS_COMMANDS = ['rollback', 'restart', 'rm ', 'drop ', 'flush', 'kill'];

const TerminalSimulator = ({ role, scenarioId, onAction }) => {
  const [history, setHistory] = useState([
    { type: 'output', content: 'Crisulator Incident Operations Console', className: 'text-slate-200 font-bold' },
    { type: 'output', content: 'Type "help" to view interactive manual.', className: 'text-slate-500 text-xs' }
  ]);
  const [input, setInput] = useState('');
  
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const streamOutput = async (lines, className) => {
    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 150)); // Artificial latency for streaming effect
      setHistory(prev => [...prev, { type: 'output', content: lines[i], time: getTimestamp(), className }]);
    }
  };

  const handleKeyDown = (e) => {
    if (isExecuting) {
      e.preventDefault();
      return;
    }

    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setHistory([]);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < cmdHistory.length) {
        setHistoryIndex(nextIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const executeCommandOnBackend = async (cmd) => {
    setIsExecuting(true);
    
    try {
      const activeScenarioId = scenarioId || 'retry_storm';
      const activeRole = role || 'oncall';

      const result = await api.evaluateCommand({
        command: cmd,
        scenario_id: activeScenarioId,
        role: activeRole,
        current_state: incidentState.metrics || {}
      });

      if (onAction) onAction(cmd, result);

      let outcomeColor = 'text-slate-300';
      if (result?.outcome === 'good') outcomeColor = 'text-green-400';
      if (result?.outcome === 'bad') outcomeColor = 'text-red-400 font-bold';

      const outputLines = (result?.terminal_output || 'Execution complete.').split('\n');
      await streamOutput(outputLines, outcomeColor);

    } catch (err) {
      setHistory(prev => [...prev, {
        type: 'output',
        content: '[FATAL] Connection to central evaluation engine lost.',
        time: getTimestamp(),
        className: 'text-red-500 font-bold'
      }]);
    }
    
    setIsExecuting(false);
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    if (isExecuting) return;
    
    const cmd = input.trim();
    if (!cmd) return;

    // Handle Confirmation State
    if (pendingConfirmation) {
      setHistory(prev => [...prev, { type: 'input', content: `[y/n] $ ${cmd}`, time: getTimestamp() }]);
      setInput('');
      const norm = cmd.toLowerCase();
      if (norm === 'y' || norm === 'yes') {
        setPendingConfirmation(null);
        await executeCommandOnBackend(pendingConfirmation);
      } else {
        setHistory(prev => [...prev, { type: 'output', content: 'Execution aborted by user.', time: getTimestamp(), className: 'text-slate-500 italic' }]);
        setPendingConfirmation(null);
      }
      return;
    }

    setCmdHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setHistory(prev => [...prev, { type: 'input', content: `ops-terminal $ ${cmd}`, time: getTimestamp() }]);
    setInput('');

    const normalizedCmd = cmd.toLowerCase();

    if (normalizedCmd === 'clear') {
      setHistory([]);
      return;
    }

    if (normalizedCmd === 'help') {
      setHistory(prev => [...prev, { type: 'component', component: <InteractiveHelp />, time: getTimestamp() }]);
      return;
    }

    // Check for dangerous commands
    const isDangerous = DANGEROUS_COMMANDS.some(d => normalizedCmd.includes(d));
    if (isDangerous) {
      setPendingConfirmation(cmd);
      setHistory(prev => [...prev, { 
        type: 'output', 
        content: `WARNING: '${cmd}' is a destructive operational command. Are you sure you want to proceed? [y/n]`, 
        time: getTimestamp(), 
        className: 'text-yellow-500 font-bold' 
      }]);
      return;
    }

    await executeCommandOnBackend(cmd);
  };

  return (
    <div className="flex-1 bg-[#0a0f14] text-slate-300 font-mono text-xs p-4 overflow-y-auto flex flex-col relative h-full scrollbar-ops select-text">

      <div className="mb-4 border-b border-slate-800 pb-3 select-none shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          Incident Response Workspace Shell
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[150px] mb-2">
        {history.map((line, i) => (
          <div key={i} className={`leading-relaxed ${line.className || ''}`}>
            {line.time && <span className="text-slate-600 select-none mr-2">[{line.time}]</span>}
            {line.type === 'component' ? line.component : <span className="whitespace-pre-wrap">{line.content}</span>}
          </div>
        ))}
        {isExecuting && (
          <div className="text-slate-500 animate-pulse mt-2">
            [executing module...] <span className="inline-block w-2 h-4 bg-slate-500 align-middle ml-1"></span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleCommandSubmit} className="flex items-center border-t border-slate-800/60 pt-2 shrink-0 bg-[#0a0f14]">
        <span className={`${pendingConfirmation ? 'text-yellow-500' : 'text-ops-glow'} font-bold select-none mr-2`}>
          {pendingConfirmation ? '[y/n] $' : 'ops-terminal $'}
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          className="flex-1 bg-transparent outline-none border-none focus:ring-0 text-slate-100 p-0 text-xs font-mono disabled:opacity-50"
          autoFocus
          spellCheck="false"
          autoComplete="off"
        />
      </form>
    </div>
  );
};

export default TerminalSimulator;