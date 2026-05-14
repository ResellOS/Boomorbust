'use client';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

const ROWS = [
  { name: 'Rome Odunze', meta: 'WR·CHI', signal: 'Route share ↑ 12%', heat: 'HIGH' as const },
  { name: 'Tetairoa McMillan', meta: 'WR·CAR', signal: 'Air yards spike', heat: 'HIGH' as const },
  { name: 'Harold Fannin Jr.', meta: 'TE·CLE', signal: 'Red zone looks', heat: 'MEDIUM' as const },
];

function heatClass(h: 'HIGH' | 'MEDIUM') {
  if (h === 'HIGH') return 'bg-emerald-950 text-emerald-400 border border-emerald-500/30';
  return 'bg-amber-950 text-amber-400 border border-amber-500/30';
}

interface Props {
  loading: boolean;
}

/** Placeholder panel for Breakout Watch tab scroll target; static copy until engine ships. */
export default function BreakoutWatchPanel({ loading }: Props) {
  return (
    <div className={`${GLASS} overflow-hidden mt-4`} id="scouting-breakout">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[12px] uppercase tracking-widest text-[#64748B] font-semibold">BREAKOUT WATCH</p>
        <span className="text-[12px] text-[#22D3EE]">Signals →</span>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/[0.05] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {ROWS.map((r) => (
            <li key={r.name} className="px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-white">{r.name}</p>
                  <p className="text-[11px] text-[#64748B]">{r.meta}</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                    {r.signal}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${heatClass(r.heat)}`}>
                  {r.heat}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
