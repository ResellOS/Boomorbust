import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0F172A',
          secondary: '#1E293B',
          card: '#1A2332',
        },
        accent: {
          DEFAULT: '#6366F1',
          cyan: '#22D3EE',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
      },
    },
  },
  plugins: [],
};
export default config;
