import { motion } from 'framer-motion'

export function Timeline({ items = [] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass glow-border-purple h-full overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-neon-purple/80 shadow-glowPurple" />
          <div className="font-display text-xs tracking-[0.18em] text-slate-100/90">
            TIMELINE
          </div>
        </div>
        <div className="font-mono text-[11px] text-slate-400/70">actions</div>
      </div>

      <div className="scrollbar-cyber max-h-[240px] overflow-auto p-4">
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={`${idx}-${it.t}`} className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-neon-purple/80 to-neon-cyan/80 shadow-glowPurple" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <div className="font-mono text-[11px] text-slate-400/70">{it.t}</div>
                  <div
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                      it.kind === 'action'
                        ? 'border-neon-cyan/25 bg-neon-cyan/10 text-neon-cyan/90'
                        : 'border-neon-purple/25 bg-neon-purple/10 text-neon-purple/90'
                    }`}
                  >
                    {it.kind}
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-200/85">{it.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

