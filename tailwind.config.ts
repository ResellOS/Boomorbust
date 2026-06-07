import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Bebas Neue', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        figtree: ['var(--font-figtree)', 'Figtree', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        boom: '#36E7A1',
        bust: '#A78BFA',
        hold: '#FBBF24',
        bg: '#0a0d14',
        surface: '#0f1420',
        surface2: '#141929',
        border: '#1e2640',
        muted: '#6b7a99',
        background: {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
        },
        'bg-dark': 'var(--bg-dark)',
        'color-boom': 'var(--color-boom)',
        'color-bust': 'var(--color-bust)',
        accent: {
          DEFAULT: 'var(--indigo)',
          cyan: 'var(--cyan)',
          gold: 'var(--gold)',
        },
        text: {
          DEFAULT: '#e8ecf4',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      keyframes: {
        'scanner-sweep': {
          '0%':   { transform: 'translateY(-120%)', opacity: '0' },
          '8%':   { opacity: '1' },
          '92%':  { opacity: '1' },
          '100%': { transform: 'translateY(520%)', opacity: '0' },
        },
        'dashboard-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(54, 231, 161, 0.4)' },
          '70%': { boxShadow: '0 0 0 5px rgba(54, 231, 161, 0)' },
        },
      },
      animation: {
        'scanner': 'scanner-sweep 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'dashboard-pulse': 'dashboard-pulse 2s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
