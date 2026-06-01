/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0f1720',
          desk: '#2a2f36',
          terminal: '#050505',
          glow: '#7dd3fc',
          muted: '#cbd5e1',
          red: '#ef4444',
          green: '#22c55e',
          border: 'rgba(255,255,255,0.08)',
        }
      },
      boxShadow: {
        monitor: '0 0 20px rgba(0,0,0,0.8) inset, 0 2px 10px rgba(0,0,0,0.5)',
        crt: '0 0 2px rgba(125, 211, 252, 0.2), 0 0 15px rgba(125, 211, 252, 0.05)',
        panel: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        monitor: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'noise': "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.05%22/%3E%3C/svg%3E')",
      }
    },
  },
  plugins: [],
}

