import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 focus-visible:ring-offset-0'

const variants = {
  cyan: 'text-slate-50 bg-gradient-to-r from-neon-cyan/20 via-neon-blue/15 to-neon-purple/20 border border-neon-cyan/30 shadow-glowCyan',
  purple:
    'text-slate-50 bg-gradient-to-r from-neon-purple/20 via-neon-pink/10 to-neon-blue/15 border border-neon-purple/30 shadow-glowPurple',
  ghost: 'text-slate-100/90 bg-white/5 border border-white/12 hover:border-white/20',
}

export function AnimatedButton({
  to,
  variant = 'cyan',
  className = '',
  children,
  ...props
}) {
  const Comp = to ? Link : 'button'

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className="inline-block"
    >
      <Comp
        to={to}
        className={`${base} ${variants[variant] ?? variants.cyan} ${className}`}
        {...props}
      >
        <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-cyan/10 via-transparent to-neon-purple/10 blur-md" />
        </span>
        <span className="relative z-10">{children}</span>
        <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-neon-cyan/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Comp>
    </motion.div>
  )
}

