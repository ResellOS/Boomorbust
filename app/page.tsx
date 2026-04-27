import Link from 'next/link';

const FEATURES = [
  {
    title: 'Multi-League Dashboard',
    description: 'All your dynasty leagues in one place. Synced live from Sleeper with roster health at a glance.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: 'Trade Analyzer',
    description: 'KTC-powered trade analysis with future value weighting, positional need scoring, and age curve penalties.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M14 4l-4 16" />
      </svg>
    ),
  },
  {
    title: 'Sit/Start Optimizer',
    description: 'Week-by-week lineup recommendations driven by projections, matchup DVOA, and real-time weather.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Hero */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[#6366F1] text-xs font-semibold tracking-wide uppercase">Dynasty Intelligence</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-4">
            Dynasty{' '}
            <span className="text-[#6366F1]">Command Center</span>
          </h1>
          <p className="text-lg text-[#94A3B8] max-w-xl mx-auto">
            The most powerful dynasty fantasy football tool ever built. Manage every league, analyze every trade, win every week.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link
              href="/auth/signup"
              className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold px-8 py-3 rounded-xl transition text-sm"
            >
              Get started free
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/15 hover:border-white/30 text-[#CBD5E1] hover:text-white font-medium px-8 py-3 rounded-xl transition text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl w-full">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[#1E293B] border border-white/5 hover:border-[#6366F1]/30 rounded-2xl p-6 text-left transition-colors"
            >
              <div className="text-[#6366F1] mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
