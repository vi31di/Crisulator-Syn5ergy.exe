import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onMove = (e) => {
      const x = `${Math.round((e.clientX / window.innerWidth) * 100)}%`
      const y = `${Math.round((e.clientY / window.innerHeight) * 100)}%`
      el.style.setProperty('--x', x)
      el.style.setProperty('--y', y)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}

