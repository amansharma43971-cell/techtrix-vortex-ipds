/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          accent:  'var(--brand-accent)',
          hover: 'var(--brand-accent-hover)',
          subtle: 'var(--brand-accent-subtle)',
          navy: 'var(--brand-navy)'
        },
        surface: {
          app:  'var(--bg-app)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          subtle: 'var(--bg-subtle)'
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)'
        },
        status: {
          available: 'var(--status-available)',
          'available-bg': 'var(--status-available-bg)',
          'available-border': 'var(--status-available-border)',
          'near-expiry': 'var(--status-near-expiry)',
          'near-expiry-bg': 'var(--status-near-expiry-bg)',
          'near-expiry-border': 'var(--status-near-expiry-border)',
          hold: 'var(--status-hold)',
          'hold-bg': 'var(--status-hold-bg)',
          'hold-border': 'var(--status-hold-border)',
          recall: 'var(--status-recall)',
          'recall-bg': 'var(--status-recall-bg)',
          reserved: 'var(--status-reserved)',
          'reserved-bg': 'var(--status-reserved-bg)',
          exhausted: 'var(--status-exhausted)',
          'exhausted-bg': 'var(--status-exhausted-bg)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        hindi: ['Noto Sans Devanagari', 'sans-serif']
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)'
      }
    },
  },
  plugins: [],
}
