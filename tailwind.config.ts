import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      animation: {
        'scanner': 'scanner-sweep 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        'scanner-sweep': {
          '0%':   { transform: 'translateY(-120%)', opacity: '0' },
          '8%':   { opacity: '1' },
          '92%':  { opacity: '1' },
          '100%': { transform: 'translateY(520%)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
