// ─────────────────────────────────────────────────────────────────────────────
// Position-aware radar metric helper.
// Pentagon axes are driven by TFO formula primitives when `tfoOptions` supplies
// full inputs or hub snapshot context; otherwise falls back to deterministic
// legacy jitter for backward compatibility.
// ─────────────────────────────────────────────────────────────────────────────

import type { RadarMetric } from './PlayerHubCard';
import {
  ageCurveMultiplier,
  calculateTFOScore,
  computeSchemeScore,
  normalizeKtcTo100,
  type CalculateTFOScoreInput,
  type TFOPosition,
  type TFOVerdict,
} from '@/lib/tfo/formula';

export type SkillPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'OTHER';

/** Minimal hub row for inferring TFO inputs on the dashboard (no API import). */
export type RadarHubContext = {
  player_id: string;
  position: string;
  team: string;
  ktc_value?: number;
  seasonAvgPpg?: number;
  current_points?: number;
  forecastDelta?: number;
  /** Hub spotlight forecast — used when `getRadarMetrics` forecast arg omitted. */
  forecast?: 'boom' | 'bust';
};

export type GetRadarMetricsOptions = {
  tfoInput?: CalculateTFOScoreInput;
  hub?: RadarHubContext;
};

export const POSITION_ACCENTS: Record<SkillPosition, { hex: string; soft: string }> = {
  QB: { hex: '#FBBF24', soft: 'rgba(251,191,36,0.30)' },
  RB: { hex: '#36E7A1', soft: 'rgba(54,231,161,0.30)' },
  WR: { hex: '#22D3EE', soft: 'rgba(34,211,238,0.30)' },
  TE: { hex: '#A78BFA', soft: 'rgba(167,139,250,0.30)' },
  OTHER: { hex: '#94A3B8', soft: 'rgba(148,163,184,0.30)' },
};

/**
 * Locked F-FIG pentagon copy — each label ≤6 chars (no runtime truncation).
 * QB V1–V5: Passing Volume, Rushing Value, O-Line Quality, WR Quality, Scheme Fit
 * RB: Rushing Value, Target Share, O-Line Quality, Explosive%, Red Zone Touches
 * WR/TE: Target Share, Air Yards, Separation, YAC, Red Zone Targets
 */
const POSITION_AXES: Record<SkillPosition, string[]> = {
  QB: ['Pass V', 'Rush V', 'O-Line', 'WRQual', 'Scheme'],
  RB: ['Rush V', 'Target', 'O-Line', 'Expl%', 'RZ Tch'],
  WR: ['Target', 'AirYds', 'Separ', 'YAC', 'RZ Tgt'],
  TE: ['Target', 'AirYds', 'Separ', 'YAC', 'RZ Tgt'],
  OTHER: ['Volume', 'Effcy', 'Match', 'Scheme', 'Health'],
};

const BASELINES: Record<SkillPosition, number[]> = {
  QB: [0.78, 0.68, 0.55, 0.7, 0.62],
  RB: [0.7, 0.68, 0.6, 0.6, 0.55],
  WR: [0.74, 0.7, 0.78, 0.65, 0.7],
  TE: [0.62, 0.65, 0.6, 0.62, 0.6],
  OTHER: [0.55, 0.55, 0.55, 0.55, 0.55],
};

const OC_SCHEME_POOL = [
  'reid_tree',
  'mcvay_tree',
  'shanahan_tree',
  'lafleur',
  'air_raid',
  'run_first',
  'norv_tree',
  'default',
] as const;

export function normalizePosition(pos: string | undefined): SkillPosition {
  const p = (pos ?? '').toUpperCase();
  if (p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE') return p;
  return 'OTHER';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function toTFOPosition(pos: string): TFOPosition {
  const p = pos.toUpperCase();
  if (p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE') return p;
  return 'WR';
}

/** Same stable PRNG used historically for jitter — reused for hub inference. */
function seededUnit(seed: string, salt: number): number {
  let h = 0x811c9dc5;
  const input = `${seed}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10001) / 10000;
}

/**
 * Build TFO inputs from hub rotation data when the caller does not have a full model row.
 * Deterministic per `player_id` so shapes stay stable across renders.
 */
export function inferTFOInputFromHub(
  hub: RadarHubContext,
  forecast?: 'boom' | 'bust',
): CalculateTFOScoreInput {
  const pos = toTFOPosition(hub.position);
  const u = (s: number) => seededUnit(hub.player_id, s);

  const ktc =
    hub.ktc_value && hub.ktc_value > 0
      ? hub.ktc_value
      : Math.round(2200 + u(11) * 6200);

  const age = Math.round(22 + u(12) * 11 + (pos === 'QB' ? 2 : 0));

  const ocScheme = OC_SCHEME_POOL[Math.floor(u(13) * OC_SCHEME_POOL.length)]!;

  const boomBias = forecast === 'boom' ? 1 : forecast === 'bust' ? -1 : 0;
  const deltaN = typeof hub.forecastDelta === 'number' ? clamp(hub.forecastDelta / 8, -4, 4) : 0;

  let opportunityScore = clamp(52 + u(14) * 28 + boomBias * 10 + deltaN * 4, 8, 98);
  let redZoneShare = clamp(38 + u(15) * 35 + boomBias * 6 + deltaN * 3, 10, 95);
  const olGrade = clamp(46 + u(16) * 38, 18, 96);
  const wrCastGrade = clamp(44 + u(17) * 40, 18, 96);

  const seasonPpg = hub.seasonAvgPpg;
  const weeklyPPG =
    typeof hub.current_points === 'number'
      ? hub.current_points
      : typeof seasonPpg === 'number'
        ? seasonPpg + deltaN * 1.5
        : undefined;

  const targetShare =
    pos === 'RB' || pos === 'WR' || pos === 'TE'
      ? clamp((pos === 'RB' ? 8 : 16) + u(18) * 28 + boomBias * 5 + deltaN * 3, 4, 42)
      : undefined;

  if (forecast === 'boom') {
    opportunityScore = clamp(opportunityScore + 6, 8, 99);
    redZoneShare = clamp(redZoneShare + 5, 10, 96);
  } else if (forecast === 'bust') {
    opportunityScore = clamp(opportunityScore - 8, 8, 98);
    redZoneShare = clamp(redZoneShare - 7, 10, 92);
  }

  return {
    playerId: hub.player_id,
    position: pos,
    age,
    team: hub.team || '—',
    ocScheme,
    opportunityScore,
    olGrade,
    wrCastGrade,
    redZoneShare,
    ktcValue: ktc,
    weeklyPPG,
    targetShare,
    ocYear: u(19) > 0.72 ? 3 : u(20) > 0.45 ? 2 : 1,
    teamQbIsYoung: u(21) > 0.55,
    schemeMismatch: u(22) > 0.88,
  };
}

function schemePassingBoost(schemeScore: number): number {
  return clamp((schemeScore - 58) * 0.45, 0, 28);
}

function qbRushingContribution(input: CalculateTFOScoreInput): number {
  const w = input.weeklyPPG;
  if (typeof w === 'number') {
    const snap = input.snapShare ?? 68;
    return clamp(26 + Math.max(0, w - 17) * 4.2 + snap * 0.22, 12, 97);
  }
  return clamp(38 + (input.opportunityScore - 50) * 0.42, 18, 88);
}

function rbExplosivePct(input: CalculateTFOScoreInput): number {
  const ktcN = normalizeKtcTo100(input.ktcValue);
  const ageM = ageCurveMultiplier('RB', input.age, input.rbUsageStyle ?? 'POWER');
  return clamp(ktcN * ageM * 0.55 + input.opportunityScore * 0.45, 0, 100);
}

function wrAirYardsProxy(input: CalculateTFOScoreInput): number {
  return clamp(input.opportunityScore * 0.72 + input.redZoneShare * 0.28, 0, 100);
}

/** YAC proxy — route volume + after-catch opportunity from usage + RZ spike. */
function wrTeYacProxy(input: CalculateTFOScoreInput): number {
  const tgt = input.targetShare;
  const tgtN = typeof tgt === 'number' ? clamp((tgt / 36) * 100, 0, 100) : input.opportunityScore * 0.75;
  return clamp(tgtN * 0.42 + input.opportunityScore * 0.38 + input.redZoneShare * 0.2, 0, 100);
}

function rawAxesFromTFO(
  pos: SkillPosition,
  input: CalculateTFOScoreInput,
  schemeScore: number,
): Record<string, number> {
  const opp = clamp(input.opportunityScore, 0, 100);
  const ol = clamp(input.olGrade, 0, 100);
  const cast = clamp(input.wrCastGrade, 0, 100);
  const rz = clamp(input.redZoneShare, 0, 100);
  const tgt = input.targetShare;

  const targetNorm = typeof tgt === 'number' ? clamp((tgt / 36) * 100, 0, 100) : null;

  switch (pos) {
    case 'QB':
      return {
        'Pass V': clamp(opp * 0.4 + schemePassingBoost(schemeScore), 0, 100),
        'Rush V': qbRushingContribution(input),
        'O-Line': ol,
        WRQual: cast,
        Scheme: schemeScore,
      };
    case 'RB':
      return {
        'Rush V': clamp(opp * 0.45 + ol * 0.3 + schemeScore * 0.25, 0, 100),
        Target: targetNorm ?? 50,
        'O-Line': ol,
        'Expl%': rbExplosivePct(input),
        'RZ Tch': rz,
      };
    case 'WR':
    case 'TE':
      return {
        Target: targetNorm ?? clamp(opp * 0.85, 0, 100),
        AirYds: wrAirYardsProxy(input),
        Separ: clamp(schemeScore * 0.55 + cast * 0.45, 0, 100),
        YAC: wrTeYacProxy(input),
        'RZ Tgt': rz,
      };
    default:
      return {};
  }
}

/** Pentagon outer-ring scale by TFO verdict (locked product spec). */
export const VERDICT_PENTAGON_SCALE: Record<TFOVerdict, number> = {
  BOOM: 1.0,
  LEAN_BOOM: 0.85,
  NEUTRAL: 0.7,
  LEAN_BUST: 0.55,
  BUST: 0.4,
};

function scaleAxisToUnit(raw: number, tfoScore: number): number {
  const base = clamp(raw / 100, 0, 1);
  const structural = 0.32 + 0.68 * (tfoScore / 100);
  return clamp(base * structural, 0, 1);
}

function resolveTFOInput(
  position: string,
  playerId: string,
  forecast: 'boom' | 'bust' | undefined,
  options: GetRadarMetricsOptions | undefined,
): CalculateTFOScoreInput | null {
  const effForecast = forecast ?? options?.hub?.forecast;

  if (options?.tfoInput) {
    return { ...options.tfoInput, playerId: options.tfoInput.playerId || playerId };
  }
  if (options?.hub) {
    return inferTFOInputFromHub(
      { ...options.hub, player_id: options.hub.player_id || playerId, position: options.hub.position || position },
      effForecast,
    );
  }
  return null;
}

/**
 * Deterministic 0..1 jitter from a seed string — legacy fallback when no TFO context.
 */
function seededJitter(seed: string, salt: number): number {
  return seededUnit(seed, salt + 4000);
}

/**
 * Build a radar shape for a given position.
 *
 * When `tfoOptions` includes `tfoInput` or `hub`, axes come from TFO sub-scores
 * and overall polygon mass tracks `calculateTFOScore` (BOOM vs BUST separation).
 *
 * Optional `metricsOverride` still wins per axis label when provided.
 */
export function getRadarMetrics(
  position: string,
  playerId: string,
  metricsOverride?: Partial<Record<string, number>>,
  forecast?: 'boom' | 'bust',
  tfoOptions?: GetRadarMetricsOptions,
): RadarMetric[] {
  const pos = normalizePosition(position);
  const axes = POSITION_AXES[pos];
  const base = BASELINES[pos];
  const effForecast = forecast ?? tfoOptions?.hub?.forecast;
  const legacyBias = effForecast === 'boom' ? 0.07 : effForecast === 'bust' ? -0.07 : 0;

  const tfoInput = resolveTFOInput(position, playerId, forecast, tfoOptions);

  if (tfoInput && pos !== 'OTHER') {
    const schemeScore = computeSchemeScore(tfoInput);
    const tfoResult = calculateTFOScore(tfoInput);
    const rawMap = rawAxesFromTFO(pos, tfoInput, schemeScore);

    const verdictScale = VERDICT_PENTAGON_SCALE[tfoResult.verdict] ?? 0.7;

    return axes.map((label) => {
      const override = metricsOverride?.[label];
      if (typeof override === 'number') {
        const u = clamp(override + legacyBias, 0.05, 1);
        return { label, value: clamp(u * verdictScale, 0.08, 1) };
      }
      const raw = rawMap[label] ?? 50;
      const unit = scaleAxisToUnit(raw, tfoResult.tfoScore);
      const value = clamp(unit * verdictScale, 0.08, 1);
      return { label, value };
    });
  }

  const legacyVerdictScale =
    effForecast === 'boom'
      ? VERDICT_PENTAGON_SCALE.BOOM
      : effForecast === 'bust'
        ? VERDICT_PENTAGON_SCALE.BUST
        : VERDICT_PENTAGON_SCALE.NEUTRAL;

  return axes.map((label, i) => {
    const override = metricsOverride?.[label];
    if (typeof override === 'number') {
      const u = clamp(override + legacyBias, 0.05, 1);
      return { label, value: clamp(u * legacyVerdictScale, 0.08, 1) };
    }
    const jitter = (seededJitter(playerId, i) - 0.5) * 0.32;
    const u = clamp((base[i] ?? 0.55) + jitter + legacyBias, 0.12, 0.99);
    return {
      label,
      value: clamp(u * legacyVerdictScale, 0.08, 0.99),
    };
  });
}

export function getPositionAccent(position: string): { hex: string; soft: string } {
  return POSITION_ACCENTS[normalizePosition(position)];
}
