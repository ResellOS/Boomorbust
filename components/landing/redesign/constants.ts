export const LANDING = {
  bg: '#0a0d14',
  surface: '#0f1420',
  dark: '#080b10',
  boom: '#36E7A1',
  bust: '#A78BFA',
  text: '#e8ecf4',
  muted: '#6b7a99',
  border: '#1e2640',
} as const;

export const VERDICT_PILL: Record<string, { bg: string; text: string }> = {
  BUY: { bg: 'rgba(54,231,161,0.15)', text: '#36E7A1' },
  START: { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA' },
  SELL: { bg: 'rgba(239,68,68,0.12)', text: '#f59e0b' },
  ADD: { bg: 'rgba(54,231,161,0.12)', text: '#36E7A1' },
  REVIEW: { bg: 'rgba(251,191,36,0.12)', text: '#FBBF24' },
};

export const FEATURES = [
  { title: 'Dashboard', href: '/dashboard', desc: 'Wake up every morning to 5+ recommended actions.', accent: '#36E7A1' },
  { title: 'Trade Hub', href: '/trade', desc: 'Find the right trades. With the right managers.', accent: '#22D3EE' },
  { title: 'Player Hub', href: '/players', desc: 'Every player. Every signal. Every reason.', accent: '#A78BFA' },
  { title: 'Start / Sit', href: '/startsit', desc: 'Data-backed advice with weekly tracking.', accent: '#FBBF24' },
  { title: 'Draft Room', href: '/draft', desc: 'Draft smarter. Build dynasties.', accent: '#36E7A1' },
  { title: 'Exposure Tracker', href: '/exposure', desc: 'See your full portfolio. Find hidden risks.', accent: '#22D3EE' },
] as const;

export const MANAGERS = [
  { name: 'Mike', title: 'The Rebuilder', tags: ['Trades Often', 'Picks Hoarder', 'Loves Rookies', 'High Youth Pref'], fit: 91, color: '#36E7A1' },
  { name: 'Chris', title: 'The Gambler', tags: ['Overpays', 'Sells Now', 'Aggressive', 'Trade Does: Sell High'], fit: 38, color: '#EF4444' },
  { name: 'Jake', title: 'The Analyzer', tags: ['Low Activity', 'Values Picks', 'Patient', 'Trade Does: Hold Maxis'], fit: 72, color: '#FBBF24' },
  { name: 'Matt', title: 'The Contender', tags: ['Win Now', 'Makes Picks', 'Plays Up', 'Trade Does: Buy Vets'], fit: 15, color: '#EF4444' },
] as const;

export const TICKER_ITEMS = [
  '[18:03] BOB upgraded McBride · 72→78',
  '[18:05] New trade opportunity found',
  '[18:08] Nabers enters buy window',
  '[18:12] Manager Mike placed London on block',
  '[18:15] Williams value rising',
  '[18:18] Engine rescore complete · 537 players',
  '[18:21] Buy window detected · TE depth',
];

export const FEED_CSS = `
@keyframes landing-ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.landing-ticker-track {
  animation: landing-ticker 40s linear infinite;
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.live-pulse { animation: live-pulse 2s ease-in-out infinite; }
@keyframes row-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-row-in { animation: row-fade-in 0.5s ease-out forwards; opacity: 0; }
`;
