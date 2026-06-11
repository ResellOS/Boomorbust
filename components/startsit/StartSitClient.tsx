'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  FlexDecision,
  SeasonRecord,
  StartSitRecommendation,
} from '@/lib/startsit/types';
import PlayerAvatar from '@/components/players/PlayerAvatar';

interface StartSitClientProps {
  nflWeek: number;
  leagues: { id: string; name: string }[];
  seasonRecord: SeasonRecord;
  startThese: StartSitRecommendation[];
  sitThese: StartSitRecommendation[];
  flexDecisions: FlexDecision[];
  allRecommendations: StartSitRecommendation[];
}

function RecommendationRow({
  rec,
  variant,
}: {
  rec: StartSitRecommendation;
  variant: 'start' | 'sit';
}) {
  const barColor = variant === 'start' ? '#36E7A1' : '#ef4444';
  const scoreColor = variant === 'start' ? 'text-boom' : 'text-[#ef4444]';

  return (
    <div
      className="grid items-center gap-1.5 border-b border-border/50 px-3 py-[5px] last:border-b-0"
      style={{ gridTemplateColumns: '26px 130px 1fr 52px 44px' }}
    >
      <PlayerAvatar playerId={rec.playerId} name={rec.fullName} size={24} />
      <div className="min-w-0">
        <div className="text-[11px] text-text">{rec.fullName}</div>
        <div className="text-[9px] text-muted">
          {rec.position} · {rec.team}{' '}
          <span className="text-muted">{rec.opponent}</span>
        </div>
        <div className="text-[8px] leading-snug text-muted">{rec.reasoning}</div>
      </div>
      <div className="flex items-center gap-1 pr-1">
        <div className="h-[5px] flex-1 overflow-hidden rounded-sm bg-border">
          <div
            className="h-full rounded-sm"
            style={{ width: `${Math.min(100, rec.barScore)}%`, background: barColor }}
          />
        </div>
        <span className="font-mono text-[9px]" style={{ color: barColor }}>
          {rec.startScore.toFixed(1)}
        </span>
      </div>
      <div className={`font-mono text-[13px] font-medium text-right ${scoreColor}`}>
        {rec.confidence}
      </div>
      <div className="text-right">
        <div className="text-[8px] text-muted">Proj:</div>
        <div className="font-mono text-[9px] text-text">
          {rec.projectedPoints !== null ? rec.projectedPoints.toFixed(1) : '—'}
        </div>
      </div>
    </div>
  );
}

function FlexCard({ flex }: { flex: FlexDecision }) {
  const title =
    flex.position === 'RB'
      ? 'RB Flex Matchup'
      : flex.position === 'WR'
        ? 'WR Flex Matchup'
        : 'TE Flex Matchup';

  return (
    <div className="border-r border-border px-3 py-2.5 last:border-r-0">
      <div className="mb-2 text-[8px] uppercase tracking-wide text-muted">{title}</div>
      <div className="mb-1.5 flex items-center justify-between gap-1">
        {[flex.playerA, flex.playerB].map((p, i) => (
          <div key={p.playerId} className="contents">
            {i === 1 && (
              <div className="shrink-0 text-[10px] font-medium text-muted">VS</div>
            )}
            <div className="flex flex-1 flex-col items-center gap-[3px]">
              <PlayerAvatar playerId={p.playerId} name={p.fullName} size={28} />
              <div className="text-center text-[10px] text-text">{p.fullName}</div>
              <div className="text-center text-[8px] text-muted">
                {p.position} · {p.team}
              </div>
              <div
                className={`font-mono text-[11px] ${
                  flex.pick.playerId === p.playerId ? 'text-boom' : 'text-muted'
                }`}
              >
                {p.startScore.toFixed(1)}
              </div>
              <div className="text-[8px] text-muted">Rating</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 rounded border border-boom/15 bg-boom/[0.06] px-2 py-1.5">
        <div className="text-[8px] font-semibold uppercase tracking-wide text-boom">
          BOB Pick: <span className="text-boom">{flex.pick.fullName}</span>
        </div>
        <div className="mt-px text-[8px] leading-snug text-muted">{flex.pickNote}</div>
        <div className="mt-1 font-mono text-[9px] text-boom">+{flex.dynastyEdge} Dynasty Edge</div>
      </div>
    </div>
  );
}

export default function StartSitClient({
  nflWeek,
  leagues,
  seasonRecord,
  startThese: initialStart,
  sitThese: initialSit,
  flexDecisions: initialFlex,
  allRecommendations,
}: StartSitClientProps) {
  const router = useRouter();
  const [week, setWeek] = useState(nflWeek);
  const [leagueId, setLeagueId] = useState('all');

  const { startThese, sitThese, flexDecisions } = useMemo(() => {
    let recs = [...allRecommendations];
    if (leagueId !== 'all') {
      recs = recs.filter((r) => r.leagueIds.includes(leagueId));
    }
    recs.sort((a, b) => b.startScore - a.startScore);
    const start = recs.slice(0, 8).map((r) => ({
      ...r,
      confidence: Math.round(r.startScore),
      barScore: r.startScore,
    }));
    const sitPool = recs.filter((r) => r.startScore < 50).sort((a, b) => a.startScore - b.startScore);
    const sit = (sitPool.length >= 8 ? sitPool.slice(0, 8) : [...recs].sort((a, b) => a.startScore - b.startScore).slice(0, 8)).map(
      (r) => {
        const conf = Math.min(95, Math.round(100 - r.startScore + 38));
        return { ...r, confidence: conf, barScore: conf };
      },
    );
    const flexPool = recs.filter((r) => r.startScore >= 45 && r.startScore <= 65);
    const flex: FlexDecision[] = [];
    for (const pos of ['RB', 'WR', 'TE'] as const) {
      const group = flexPool.filter((r) => r.position === pos);
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => b.startScore - a.startScore);
      const playerA = sorted[0];
      const playerB = sorted[1];
      const pick = playerA.startScore >= playerB.startScore ? playerA : playerB;
      const other = pick.playerId === playerA.playerId ? playerB : playerA;
      flex.push({
        position: pos,
        playerA,
        playerB,
        pick,
        pickNote: `${pick.fullName} has matchup edge over ${other.fullName}`,
        dynastyEdge: Math.round(Math.abs(playerA.startScore - playerB.startScore) * 10) / 10,
      });
    }
    return { startThese: start, sitThese: sit, flexDecisions: flex };
  }, [allRecommendations, leagueId]);

  const displayStart = leagueId === 'all' ? initialStart : startThese;
  const displaySit = leagueId === 'all' ? initialSit : sitThese;
  const displayFlex = leagueId === 'all' ? initialFlex : flexDecisions;

  const handleWeekChange = (delta: number) => {
    const next = Math.min(18, Math.max(1, week + delta));
    setWeek(next);
    router.push(`/startsit?week=${next}${leagueId !== 'all' ? `&league=${leagueId}` : ''}`);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between px-[18px] pb-1.5 pt-2.5">
        <div>
          <div className="text-[22px] font-bold uppercase tracking-[-0.5px] text-text">
            Start / Sit
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Week {week} decisions. Backed by data, not gut.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[5px] border border-border bg-surface2">
            <button
              type="button"
              onClick={() => handleWeekChange(-1)}
              className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-[13px] text-muted hover:text-text"
            >
              ‹
            </button>
            <span className="flex h-7 items-center border-x border-border px-2.5 text-[11px] text-text">
              Week {week}
            </span>
            <button
              type="button"
              onClick={() => handleWeekChange(1)}
              className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-[13px] text-muted hover:text-text"
            >
              ›
            </button>
          </div>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="h-7 cursor-pointer rounded-[5px] border border-border bg-surface2 px-2.5 font-figtree text-[11px] text-text outline-none"
          >
            <option value="all">All Leagues</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-3 [scrollbar-width:thin]">
        <div className="mb-2.5 flex items-center gap-0 rounded-md border border-border bg-surface px-4 py-3">
          <div className="flex-1">
            <div className="mb-1.5 text-[8px] uppercase tracking-[1.5px] text-muted">
              Verified Season Record
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="font-mono text-[28px] font-bold text-boom">{seasonRecord.wins}</div>
                <div className="text-[9px] text-muted">Win</div>
              </div>
              <span className="font-mono text-xl text-muted">-</span>
              <div className="text-center">
                <div className="font-mono text-[28px] font-bold text-[#ef4444]">
                  {seasonRecord.losses}
                </div>
                <div className="text-[9px] text-muted">Loss</div>
              </div>
              <span className="font-mono text-xl text-muted">-</span>
              <div className="text-center">
                <div className="font-mono text-[28px] font-bold text-muted">
                  {seasonRecord.pushes}
                </div>
                <div className="text-[9px] text-muted">Push</div>
              </div>
            </div>
          </div>
          <div className="mx-6 h-[60px] w-px bg-border" />
          <div className="flex items-center gap-3.5">
            <div className="font-mono text-4xl font-bold text-boom">{seasonRecord.winRate}%</div>
            <div>
              <div className="text-[11px] font-medium text-text">WIN RATE</div>
              <div className="text-[9px] text-muted">
                Verified across {seasonRecord.totalDecisions.toLocaleString()} lineup decisions
              </div>
              <div className="text-[9px] text-muted">Updated after every game</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-boom/30 bg-boom/10 text-base text-boom">
              ✓
            </div>
          </div>
        </div>

        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-boom">
                ▲ START THESE
              </div>
              <div className="text-[9px] text-muted">High confidence plays for Week {week}</div>
            </div>
            {displayStart.length > 0 ? (
              displayStart.map((r) => (
                <RecommendationRow key={r.playerId} rec={r} variant="start" />
              ))
            ) : (
              <div className="px-3 py-6 text-center text-[11px] text-muted">No start calls yet</div>
            )}
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#ef4444]">
                ▼ SIT THESE
              </div>
              <div className="text-[9px] text-muted">Fade these plays in Week {week}</div>
            </div>
            {displaySit.length > 0 ? (
              displaySit.map((r) => (
                <RecommendationRow key={r.playerId} rec={r} variant="sit" />
              ))
            ) : (
              <div className="px-3 py-6 text-center text-[11px] text-muted">No sit calls yet</div>
            )}
          </div>
        </div>

        {displayFlex.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <div className="text-[10px] font-semibold text-hold">⚡ FLEX DECISIONS</div>
              <div className="text-[9px] text-muted">Too close to call — BOB breaks the tie</div>
            </div>
            <div className="grid grid-cols-3">
              {displayFlex.map((f) => (
                <FlexCard key={f.position} flex={f} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
