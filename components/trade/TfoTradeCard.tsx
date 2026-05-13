'use client';

import PlayerAvatar from '@/components/PlayerAvatar';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import {
  calculateTFOScore,
  type TFOGrade,
  type TFOPosition,
  type TFOVerdict,
} from '@/lib/tfo/formula';

export interface TfoTradeCardPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  ktc: number;
}

const POS_BORDER: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

function isTfoPos(p: string): p is TFOPosition {
  return p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE';
}

function gradeHex(grade: TFOGrade): string {
  switch (grade) {
    case 'ELITE':
      return '#36E7A1';
    case 'HIGH_VALUE':
      return '#22D3EE';
    case 'VIABLE':
      return '#94A3B8';
    case 'SPECULATIVE':
      return '#FBBF24';
    default:
      return '#EF4444';
  }
}

function verdictHex(v: TFOVerdict): string {
  switch (v) {
    case 'BOOM':
    case 'LEAN_BOOM':
      return '#36E7A1';
    case 'BUST':
    case 'LEAN_BUST':
      return '#EF4444';
    default:
      return '#94A3B8';
  }
}

function runTfoAtAge(p: TfoTradeCardPlayer, age: number) {
  if (!isTfoPos(p.position)) return null;
  const a = Number.isFinite(age) ? Math.min(Math.max(age, 18), 45) : 26;
  return calculateTFOScore({
    playerId: p.player_id,
    position: p.position,
    age: a,
    team: (p.team ?? 'FA').toUpperCase(),
    ocScheme: schemeForTeam(p.team),
    opportunityScore: 75,
    olGrade: 70,
    wrCastGrade: 70,
    redZoneShare: 52,
    ktcValue: p.ktc,
    ocYear: 3,
  });
}

export default function TfoTradeCard({
  player,
  side,
}: {
  player: TfoTradeCardPlayer;
  side: 'give' | 'get';
}) {
  const border = POS_BORDER[player.position] ?? '#64748B';
  const baseAge = player.age ?? 26;
  const y2025 = runTfoAtAge(player, baseAge);
  const y2026 = runTfoAtAge(player, baseAge + 1);
  const y2027 = runTfoAtAge(player, baseAge + 2);
  const primary = y2026 ?? y2025 ?? y2027;
  if (!primary) return null;

  const triple = [
    { label: '2025', r: y2025 },
    { label: '2026', r: y2026 },
    { label: '2027', r: y2027 },
  ];
  const nums = triple.map((x) => x.r?.tfoScore ?? null);
  const trend =
    nums[0] != null && nums[2] != null
      ? nums[2]! > nums[0]! + 0.5
        ? 'up'
        : nums[2]! < nums[0]! - 0.5
          ? 'down'
          : 'flat'
      : 'flat';

  return (
    <div
      className="glass-panel rounded-xl p-[14px] border border-white/[0.08]"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      <div className="flex items-center gap-3 mb-3">
        <PlayerAvatar playerId={player.player_id} playerName={player.name} position={player.position} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold truncate text-sm">{player.name}</p>
          <span
            className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded text-black"
            style={{ background: border }}
          >
            {player.position}
          </span>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="tabular-nums text-xl font-bold" style={{ color: gradeHex(primary.grade) }}>
          {primary.tfoScore.toFixed(1)}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: gradeHex(primary.grade) }}>
          {primary.grade.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-mono">
        {triple.map(({ label, r }, i) => {
          const prev = i > 0 ? triple[i - 1]!.r?.tfoScore : null;
          const cur = r?.tfoScore;
          let c = '#94A3B8';
          if (cur != null && prev != null) {
            if (cur > prev + 0.25) c = '#36E7A1';
            else if (cur < prev - 0.25) c = '#EF4444';
          } else if (trend === 'up' && i === 2) c = '#36E7A1';
          else if (trend === 'down' && i === 2) c = '#EF4444';
          return (
            <span key={label} className="tabular-nums" style={{ color: c }}>
              {label}: {r ? r.tfoScore.toFixed(1) : '—'}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[10px] font-black uppercase px-2 py-0.5 rounded border"
          style={{
            color: verdictHex(primary.verdict),
            borderColor: `${verdictHex(primary.verdict)}55`,
            background: `${verdictHex(primary.verdict)}14`,
          }}
        >
          {primary.verdict.replace(/_/g, ' ')}
        </span>
        <p className="text-[11px] text-[#94A3B8] truncate flex-1 min-w-0" title={primary.reasoning}>
          {primary.reasoning.length > 120 ? `${primary.reasoning.slice(0, 117)}…` : primary.reasoning}
        </p>
      </div>
      <p className="text-[9px] text-[#475569] mt-2 font-mono uppercase">
        {side === 'give' ? 'You give' : 'You get'}
      </p>
    </div>
  );
}
