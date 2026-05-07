'use client';

export interface MatchupPlayer {
  name: string;
  position: string;
  team: string;
  context: string;
  projectedPts: number;
  delta: number;
  confidence: number;
}

interface Props {
  week: number;
  totalMatchups: number;
  myScore: number;
  oppScore: number;
  players: [MatchupPlayer, MatchupPlayer];
}

const POS_COLORS: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FEBC2E',
  TE: '#A78BFA',
};

export default function MatchupBanner({ week, totalMatchups, myScore, oppScore, players }: Props) {
  const winning = myScore > oppScore;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-[#0D1017] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              WEEK {week} — {totalMatchups} of {totalMatchups} Matchups
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-2xl font-black ${winning ? 'text-[#36E7A1]' : 'text-white'}`}>
                {myScore.toFixed(1)}
              </span>
              <span className="text-slate-600 text-sm font-bold">vs</span>
              <span className="text-2xl font-black text-slate-400">{oppScore.toFixed(1)}</span>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${
              winning
                ? 'bg-[#36E7A1]/10 border-[#36E7A1]/20 text-[#36E7A1]'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {winning ? 'WINNING' : 'LOSING'}
          </span>
        </div>
        <button className="text-[11px] font-semibold text-[#22D3EE] border border-[#22D3EE]/20 rounded-lg px-3 py-1.5 hover:bg-[#22D3EE]/5 transition-colors">
          Close to View →
        </button>
      </div>

      {/* Player comparison */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
        {players.map((player, i) => {
          const posColor = POS_COLORS[player.position] ?? '#94A3B8';
          const isPositive = player.delta > 0;
          const cardGradient = i === 0
            ? 'from-[#0B2B1E]/90 to-[#0D1017]'
            : 'from-[#0D1C38]/90 to-[#0D1017]';
          const glowColor = i === 0
            ? 'rgba(54,231,161,0.06)'
            : 'rgba(34,211,238,0.06)';
          const circumference = 2 * Math.PI * 18;

          return (
            <div
              key={i}
              className={`relative p-5 bg-gradient-to-br ${cardGradient} overflow-hidden`}
              style={{ boxShadow: `inset 0 0 80px ${glowColor}` }}
            >
              {/* Watermark */}
              <div className="absolute -bottom-6 -right-2 text-[100px] leading-none font-black opacity-[0.03] text-white select-none pointer-events-none">
                ◆
              </div>

              <div className="relative z-10">
                {/* Position + team */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: `${posColor}20`, color: posColor }}
                  >
                    {player.position}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {player.team}
                  </span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-slate-600">{player.context}</span>
                </div>

                {/* Name + delta */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                    {player.name}
                  </h3>
                  <div
                    className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg font-black text-base ml-2 shrink-0 ${
                      isPositive ? 'bg-[#36E7A1]/10 text-[#36E7A1]' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}{player.delta.toFixed(1)}
                  </div>
                </div>

                {/* Projected pts + confidence ring */}
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-0.5">
                      Projected
                    </div>
                    <div className="text-3xl font-black text-white leading-none">
                      {player.projectedPts.toFixed(1)}
                    </div>
                  </div>

                  <div className="relative w-11 h-11">
                    <svg viewBox="0 0 44 44" className="w-full h-full">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#1F2937" strokeWidth="3" />
                      <circle
                        cx="22" cy="22" r="18"
                        fill="none"
                        stroke={posColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${circumference * player.confidence / 100} ${circumference}`}
                        strokeDashoffset={circumference / 4}
                        transform="rotate(-90 22 22)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">{player.confidence}%</span>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-slate-600 mt-2">
                  Expected to confirm ranking ·{' '}
                  <span style={{ color: posColor }}>{player.confidence}% Confidence Index</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
