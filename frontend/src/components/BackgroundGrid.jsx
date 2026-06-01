import { motion } from 'framer-motion'

export function BackgroundGrid() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <motion.div
        className="absolute inset-0 grid-overlay opacity-70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.72 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(800px 420px at 50% 0%, rgba(34,211,238,0.14), transparent 70%)',
        }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-x-24 top-0 h-56 animate-scan bg-gradient-to-b from-transparent via-neon-cyan/20 to-transparent blur-sm" />
      </div>
    </div>
  )
}
