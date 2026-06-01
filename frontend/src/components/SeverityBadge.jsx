const map = {
  SEV0: { label: 'SEV0', cls: 'border-red-400/35 text-red-200 bg-red-500/10' },
  SEV1: { label: 'SEV1', cls: 'border-orange-400/35 text-orange-200 bg-orange-500/10' },
  SEV2: { label: 'SEV2', cls: 'border-yellow-400/35 text-yellow-200 bg-yellow-500/10' },
  SEV3: { label: 'SEV3', cls: 'border-cyan-400/35 text-cyan-200 bg-cyan-500/10' },
  SEV4: { label: 'SEV4', cls: 'border-slate-400/35 text-slate-200 bg-slate-500/10' },
}

export function SeverityBadge({ severity = 'SEV2', className = '' }) {
  const v = map[severity] ?? map.SEV2
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider ${v.cls} ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80" />
      <span className="font-mono">{v.label}</span>
    </div>
  )
}

