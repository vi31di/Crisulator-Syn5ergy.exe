import React, { useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

const METRIC_CONFIGS = {
  error_rate: {
    label: 'API Ingress Error Rate',
    unit: '%',
    color: '#ef4444',
    max: 100,
    warn: 25,
    crit: 55
  },
  p95_latency: {
    label: 'P95 Response Latency',
    unit: 'ms',
    color: '#3b82f6',
    max: 10000,
    warn: 2000,
    crit: 4500
  },
  db_connections: {
    label: 'Postgres Connection Saturation',
    unit: '%',
    color: '#eab308',
    max: 100,
    warn: 70,
    crit: 90
  },
  cpu_throttling: {
    label: 'Kubernetes CPU Throttling',
    unit: '%',
    color: '#a855f7',
    max: 100,
    warn: 50,
    crit: 80
  }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && Array.isArray(payload) && payload.length > 0) {
    const value = payload[0]?.value ?? 0;
    const name = payload[0]?.name || 'Value';
    const unit = payload[0]?.payload?.unit || '%';
    
    return (
      <div className="bg-[#0b0e14] border border-[#2d3139] p-3 rounded shadow-lg font-mono text-[10px] text-slate-300 w-56">
        <div className="text-slate-500 border-b border-[#2d3139] pb-1 mb-1.5">
          TIME: {label || '00:00:00'}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-[9px] uppercase">{name}:</span>
          <span className="font-bold text-slate-100">{value.toLocaleString()}{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function MetricsPanel(props) {
  const p = props && typeof props === 'object' ? props : {};
  const score = typeof p.score === 'number' && !isNaN(p.score) ? p.score : 50;
  
  const [focusedKey, setFocusedKey] = useState('error_rate');
  const activeMetric = METRIC_CONFIGS[focusedKey] || METRIC_CONFIGS.error_rate;

  // 1. Memoize chart datasets to eliminate state dependency loops
  const chartData = useMemo(() => {
    const baseScore = Math.max(0, Math.min(100, score));
    const currentSeverity = 100 - baseScore; // higher severity = lower score
    
    return Array.from({ length: 15 }).map((_, i) => {
      const pastTime = new Date(Date.now() - (15 - i) * 60000).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit'
      });
      
      const seed = Math.sin(i * 0.9) * 4;
      const noise = Math.cos(i * 1.5) * 3;
      
      return {
        time: pastTime,
        unit: activeMetric.unit,
        error_rate: Math.max(5, Math.round(currentSeverity * (0.8 + seed * 0.002) + noise)),
        p95_latency: Math.max(120, Math.round(currentSeverity * 50 * (0.95 + noise * 0.005) + 300 + seed * 10)),
        db_connections: Math.max(8, Math.round(currentSeverity * (0.7 + seed * 0.003) + 15 + noise)),
        cpu_throttling: Math.max(12, Math.round(currentSeverity * (0.75 + noise * 0.002) + 20 + seed))
      };
    });
  }, [score, activeMetric.unit]);

  // 2. Safe parsing of active event labels (incident markers)
  const timelineEvents = useMemo(() => {
    const arr = Array.isArray(p.timeline) ? p.timeline : [];
    return arr.map(t => {
      if (!t) return null;
      const textVal = t.label || t.text || t.action || t.feedback || '';
      return {
        time: typeof t.time === 'string' ? t.time : '',
        text: typeof textVal === 'string' ? textVal : ''
      };
    }).filter(t => t && t.time !== '' && t.text !== '' && !t.text.includes('War Room'));
  }, [p.timeline]);

  const activeValue = chartData.length > 0 && typeof chartData[chartData.length - 1][focusedKey] === 'number' 
    ? chartData[chartData.length - 1][focusedKey] 
    : 0;

  return (
    <div className={`h-full flex flex-col bg-[#0b0e14] border border-[#2d3139] text-[#d8d9da] font-mono ${p.isMasked ? 'blur-sm opacity-50 select-none pointer-events-none' : ''}`}>
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[#2d3139] px-4 py-2.5 bg-[#141920] select-none shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-[10px] font-bold tracking-wider text-slate-200">
            GRAFANA TELEMETRY MONITOR
          </span>
        </div>
        <div className="text-[9px] text-slate-500 uppercase tracking-widest">
          SYSTEM_ONLINE
        </div>
      </div>

      {/* Flat metrics selection tabs */}
      <div className="flex border-b border-[#2d3139] bg-[#0c0f16] shrink-0 overflow-x-auto scrollbar-none select-none">
        {Object.keys(METRIC_CONFIGS).map(key => {
          const cfg = METRIC_CONFIGS[key];
          return (
            <button
              key={key}
              onClick={() => setFocusedKey(key)}
              className={`px-4 py-2 border-r border-[#2d3139] text-[9px] font-bold uppercase transition-all tracking-wider shrink-0 cursor-pointer ${
                focusedKey === key 
                  ? 'bg-[#141920] text-slate-100 border-t border-t-cyan-500' 
                  : 'text-slate-500 hover:text-slate-350 hover:bg-[#141920]/40'
              }`}
            >
              {cfg.label.replace('Kubernetes ', '').replace('Postgres ', '').replace('API Ingress ', '')}
            </button>
          );
        })}
      </div>

      {/* Main dashboard content */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden bg-[#0b0e14]">
        
        {/* Readout stats */}
        <div className="flex justify-between items-end select-none shrink-0 border-b border-[#1e222a] pb-3">
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">{activeMetric.label}</div>
            <div className="text-3xl font-black text-slate-100 tracking-tight flex items-baseline gap-1">
              <span>{activeValue.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-normal">{activeMetric.unit}</span>
            </div>
          </div>
          
          <div className="text-right text-[8px] text-slate-500 space-y-0.5 font-bold">
            <div>THRESHOLD WARN: {activeMetric.warn} {activeMetric.unit}</div>
            <div>THRESHOLD CRIT: {activeMetric.crit} {activeMetric.unit}</div>
          </div>
        </div>

        {/* Clean Static Grafana Graph Visualizer */}
        <div className="flex-1 min-h-[180px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${focusedKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" opacity={0.4} />
              <XAxis 
                dataKey="time" 
                stroke="#5c626d" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={6}
              />
              <YAxis 
                domain={[0, activeMetric.max]} 
                stroke="#5c626d" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={6}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#5c626d', strokeWidth: 1 }} />
              
              {/* Warning Threshold Line */}
              <ReferenceLine 
                y={activeMetric.warn} 
                stroke="#eab308" 
                strokeDasharray="4 4" 
                opacity={0.6}
                label={{ value: 'WARN', fill: '#eab308', fontSize: 7, position: 'insideBottomRight' }}
              />
              
              {/* Critical Threshold Line */}
              <ReferenceLine 
                y={activeMetric.crit} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                opacity={0.6}
                label={{ value: 'CRIT', fill: '#ef4444', fontSize: 7, position: 'insideBottomRight' }}
              />
              
              {/* Incident Event Markers (Vertical Reference Lines) */}
              {timelineEvents.slice(-3).map((evt, idx) => (
                <ReferenceLine 
                  key={idx}
                  x={evt.time}
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  label={{ value: '🚨 EVENT', fill: '#a855f7', fontSize: 7, position: 'top' }}
                />
              ))}

              {/* Area fill and stroke line */}
              <Area 
                type="monotone" 
                name={activeMetric.label}
                dataKey={focusedKey} 
                stroke={activeMetric.color} 
                fill={`url(#grad-${focusedKey})`} 
                strokeWidth={1.5} 
                isAnimationActive={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}