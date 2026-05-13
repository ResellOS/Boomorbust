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
  QB: '#FBBF24',
  TE: '#A78BFA',
};

export default function MatchupBanner({ week, totalMatchups, myScore, oppScore, players }: Props) {
  const winning = myScore > oppScore;

  return (
    <section className="glass-panel overflow-hidden !rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 font-mono tabular-nums">
              WEEK {week} — {totalMatchups} of {totalMatchups} Matchups
            </p>
            <div className="flex items-center gap-2 mt-0.5 font-mono tabular-nums">
              <span className={`text-2xl font-black ${winning ? 'text-[#36E7A1]' : 'text-white'}`}>
                {myScore.toFixed(1)}
              </span>
              <span className="text-slate-600 text-sm font-bold font-mono">vs</span>
              <span className="text-2xl font-black text-slate-400">{oppScore.toFixed(1)}</span>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border font-mono ${
              winning
                ? 'bg-[#36E7A1]/10 border-[#36E7A1]/20 text-[#36E7A1]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/25 text-[#EF4444]'
            }`}
          >
            {winning ? 'WINNING' : 'LOSING'}
          </span>
        </div>
        <button className="text-[11px] font-semibold text-[#22D3EE] border border-[#22D3EE]/20 rounded-lg px-3 py-1.5 hover:bg-[#22D3EE]/5 transition-colors font-mono">
          Close to View →
        </button>
      </div>

      {/* Player comparison */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
        {players.map((player, i) => {
          const posColor = POS_COLORS[player.position] ?? '#94A3B8';
          const isPositive = player.delta > 0;
          const cardGradient = i === 0
            ? 'from-[#061810]/90 to-[#060910]'
            : 'from-[#061018]/90 to-[#060910]';
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
                    className="text-[9px] font-black px-1.5 py-0.5 rounded font-mono"
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
                    className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg font-black text-base ml-2 shrink-0 font-mono tabular-nums ${
                      isPositive ? 'bg-[#36E7A1]/10 text-[#36E7A1]' : 'bg-[#EF4444]/10 text-[#EF4444]'
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
                    <div className="text-3xl font-black text-white leading-none font-mono tabular-nums">
                      {player.projectedPts.toFixed(1)}
                    </div>
                  </div>

                  <div className="relative w-11 h-11">
                    <svg viewBox="0 0 44 44" className="w-full h-full">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
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
                      <span className="text-[9px] font-black text-white font-mono tabular-nums">{player.confidence}%</span>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-slate-600 mt-2 font-mono">
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
