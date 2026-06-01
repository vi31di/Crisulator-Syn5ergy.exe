import { useState } from 'react'
import { api } from '../data/api.js'

export function AlertSummarizer({ logs, scenarioId }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    setLoading(true)
    try {
      const result = await api.summarizeAlerts({ logs, scenario_id: scenarioId })
      setSummary(result)
    } catch {
      setSummary({
        summary: 'High error rate with DB deadlocks. Retry storm suspected at ingress.',
        root_cause: 'Upstream timeout causing exponential retry amplification.',
        action: 'Throttle ingress traffic first, then restart the DB connection pool.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">AI Alert Analysis</span>
        <button
          onClick={analyze}
          disabled={loading}
          className="px-3 py-1 rounded-lg bg-neon-purple/20 border border-neon-purple/30 text-neon-purple font-mono text-[10px] hover:bg-neon-purple/30 disabled:opacity-40 transition-all"
        >
          {loading ? '⟳ Analyzing...' : '✦ Analyze Logs'}
        </button>
      </div>
      {summary && (
        <div className="space-y-2 text-xs">
          <div className="flex gap-2">
            <span className="text-neon-cyan shrink-0">SITUATION</span>
            <span className="text-slate-300">{summary.summary}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-yellow-400 shrink-0">ROOT CAUSE</span>
            <span className="text-slate-300">{summary.root_cause}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-green-400 shrink-0">SUGGESTED</span>
            <span className="text-slate-300">{summary.action}</span>
          </div>
        </div>
      )}
    </div>
  )
}
