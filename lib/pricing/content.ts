export const FEATURE_TABLE = [
  {
    category: 'Core Tools',
    icon: '🔧',
    color: 'text-[#60a5fa]',
    rows: [
      { label: 'Leagues synced', values: ['1', '5', '10', 'Unlimited'] },
      { label: 'Sit/start recommendations', checks: [true, true, true, true] },
      { label: 'Weekly BOOM/BUST verdicts', checks: [true, true, true, true] },
      { label: 'Bust alert', checks: [true, true, true, true] },
      { label: 'Trade grader', values: ['1/day', '✓', '✓', '✓'] },
      { label: 'Smart counter', values: ['1/day', '✓', '✓', '✓'] },
      { label: 'Buy/sell ticker', checks: [false, true, true, true] },
      { label: 'Ads shown', values: ['Yes', 'No', 'No', 'No'] },
    ],
  },
  {
    category: 'Market Intelligence',
    icon: '📈',
    color: 'text-[#f472b6]',
    rows: [
      { label: 'Edge Score (BVI) vs KTC', checks: [false, true, true, true] },
      { label: 'Momentum score (DMS)', checks: [false, true, true, true] },
      { label: 'Sell window (DAC)', checks: [false, true, true, true] },
      { label: 'Full player component breakdown', checks: [false, true, true, true] },
      { label: 'Trade history graded', checks: [false, true, true, true] },
    ],
  },
  {
    category: 'League Intelligence',
    icon: '🏆',
    color: 'text-hold',
    rows: [
      { label: 'Trade finder', checks: [false, false, true, true] },
      { label: 'League Intelligence (LI)', checks: [false, false, true, true] },
      { label: 'Scout Their Team', checks: [false, false, true, true] },
      { label: 'Dynasty 3-year outlook', checks: [false, false, true, true] },
    ],
  },
  {
    category: 'Projection Engines',
    icon: '🔬',
    color: 'text-bust',
    rows: [
      { label: 'Breakout meter alerts (BPS)', checks: [false, false, true, true] },
      { label: 'Playoff outlook (SOSPP)', checks: [false, false, true, true] },
      { label: 'Luck factor / regression (RI)', checks: [false, false, true, true] },
      { label: 'Rookie grade (RTS)', checks: [false, false, true, true] },
      { label: 'Rejection predictor', checks: [false, false, true, true] },
    ],
  },
  {
    category: 'Elite Tools',
    icon: '⚡',
    color: 'text-boom',
    rows: [
      { label: 'Startup draft tracking', values: ['✗', '✗', '✗', '1 free/yr'] },
      { label: 'All 17 engines unlocked', checks: [false, false, false, true] },
      { label: 'Market verdict (vs consensus)', checks: [false, false, false, true] },
      { label: 'Dynasty power rating (Empire)', checks: [false, false, false, true] },
      { label: 'Portfolio manager', checks: [false, false, false, true] },
      { label: 'Priority support', checks: [false, false, false, true] },
      { label: 'Content export', checks: [false, false, false, true] },
    ],
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade instantly, downgrade at end of billing period.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'Yes — 7 days free on League Analyst and General Manager. All-Pro has a 3-day trial.',
  },
  {
    q: 'Does BOB send trades for me?',
    a: 'No. BoB builds the offer and explains the strategy. You copy it and send on Sleeper yourself.',
  },
  {
    q: 'What happens if I hit my league limit on free?',
    a: 'Your existing league stays active. Link more leagues by upgrading.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You keep access until the end of your billing period. Always. No immediate cutoff.',
  },
  {
    q: 'Does this work for all league formats?',
    a: 'Yes. BoB auto-detects your league settings — PPR, half PPR, superflex, TE premium — and adjusts every score accordingly.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes, within 7 days of any charge. No questions asked.',
  },
  {
    q: 'What is League Intelligence?',
    a: 'BoB analyzes every manager in your league — their trade history, draft behavior, tendencies — and tells you exactly how to approach each one.',
  },
  {
    q: 'Will my data be used for ads?',
    a: 'Never. Your league data is private. Ads on free tier are programmatic only — we never sell or share your data.',
  },
] as const;

export const ENGINE_TAGS = [
  'TFO', 'DMS', 'BPS', 'RTS', 'DAC',
  'RI', 'SOSPP', 'F-FIG', 'OPS', 'SFS',
  'SASSP', 'DPM', 'BBE', 'YOYSI', 'CIM',
] as const;
