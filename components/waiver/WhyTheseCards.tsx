'use client';

const CARDS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#36E7A1" strokeWidth="1.5" opacity="0.4"/>
        <path d="M9 19L14 9L19 19" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.5 16h7" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'BBSM SCORE',
    body: 'Our Boom Bust Score Model predicts short term impact.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#22D3EE" strokeWidth="1.5" opacity="0.4"/>
        <path d="M7 18l4-6 3 4 2-3 5 5" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'TRENDING SIGNALS',
    body: 'Momentum indicators catch breakouts early.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#FBBF24" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="14" cy="11" r="3" stroke="#FBBF24" strokeWidth="1.5"/>
        <path d="M8 21c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'OPPORTUNITY',
    body: 'We prioritize players earning more usage.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#A78BFA" strokeWidth="1.5" opacity="0.4"/>
        <rect x="9" y="9" width="10" height="10" rx="1" stroke="#A78BFA" strokeWidth="1.5"/>
        <path d="M12 14h4M14 12v4" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'ROSTER FIT',
    body: 'Targets match your roster construction.',
  },
];

export default function WhyTheseCards() {
  return (
    <div className="glass-card p-4">
      <h2 className="text-[12px] font-bold text-white tracking-wide mb-4 uppercase">Why These Players?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map(({ icon, title, body }) => (
          <div key={title} className="flex flex-col items-center text-center gap-2">
            <div className="mb-1">{icon}</div>
            <p className="text-[11px] font-bold text-white">{title}</p>
            <p className="text-[10px] text-slate-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
