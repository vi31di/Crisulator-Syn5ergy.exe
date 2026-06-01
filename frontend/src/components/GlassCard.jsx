import { motion } from 'framer-motion'

export function GlassCard({
  glow = 'cyan',
  className = '',
  children,
  as: Comp = 'div',
  ...props
}) {
  const glowClass = glow === 'purple' ? 'glow-border-purple' : 'glow-border-cyan'

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={`glass ${glowClass} relative overflow-hidden rounded-2xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-neon-cyan/10 blur-2xl" />
        <div className="absolute -right-24 top-1/3 h-44 w-44 rounded-full bg-neon-purple/10 blur-2xl" />
      </div>
      <Comp className="relative z-10" {...props}>
        {children}
      </Comp>
    </motion.div>
  )
}

