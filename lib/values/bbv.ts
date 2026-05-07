// BBV (Boom-or-Bust Value) — opportunity-weighted dynasty score
// Formula: KTC base × age-dynasty curve × depth chart position × health factor

export interface BBVInput {
  player_id: string;
  player_name: string;
  position: string;
  team: string | null;
  age: number | null;
  depth_chart_order: number | null;
  injury_status: string | null;
  ktc_value: number;
}

export interface BBVResult {
  player_id: string;
  player_name: string;
  position: string;
  team: string | null;
  age: number | null;
  bbv_score: number;
  depth_order: number | null;
  ktc_value: number;
}

// Peak production age by position (dynasty value peaks here)
const PEAK_AGE: Record<string, number> = { QB: 29, RB: 24, WR: 25, TE: 27 };
// Years past peak before near-zero dynasty value
const SHELF_LIFE: Record<string, number> = { QB: 9, RB: 5, WR: 7, TE: 8 };

function ageDynastyFactor(age: number | null, position: string): number {
  if (age == null) return 0.85;
  const peak = PEAK_AGE[position] ?? 26;
  const shelf = SHELF_LIFE[position] ?? 7;
  const delta = age - peak;

  if (delta < -5) return 0.87;                                // very young — future upside but unproven
  if (delta < 0) return 1.0 + Math.abs(delta) * 0.008;       // approaching peak
  if (delta === 0) return 1.06;                               // peak year premium
  if (delta <= 2) return 1.06 - delta * 0.05;                // early decline
  if (delta <= shelf) return 0.96 - (delta - 2) * 0.065;     // active decline
  return Math.max(0.40, 0.70 - (delta - shelf) * 0.09);      // aging out
}

function depthMultiplier(depthOrder: number | null): number {
  if (depthOrder == null) return 0.80; // unknown — assume some role
  if (depthOrder === 1) return 1.05;   // starter premium
  if (depthOrder === 2) return 0.72;   // backup / rotational
  if (depthOrder === 3) return 0.47;   // third-stringer
  return 0.28;                         // depth / practice squad level
}

function healthFactor(injuryStatus: string | null): number {
  if (!injuryStatus) return 1.0;
  const s = injuryStatus.toUpperCase();
  if (s === 'Q') return 0.97;
  if (s === 'D') return 0.93;
  if (s === 'O') return 0.78;
  if (s === 'IR' || s === 'PUP' || s === 'NFI') return 0.55;
  return 1.0;
}

const POSITION_BASELINE: Record<string, number> = {
  QB: 3200, RB: 2600, WR: 2900, TE: 2300,
};

export function calculateBBVScore(input: BBVInput): BBVResult {
  // KTC is the market consensus; use it as the base when meaningful
  const base = input.ktc_value > 50 ? input.ktc_value : (POSITION_BASELINE[input.position] ?? 1500);

  const raw =
    base *
    ageDynastyFactor(input.age, input.position) *
    depthMultiplier(input.depth_chart_order) *
    healthFactor(input.injury_status);

  return {
    player_id: input.player_id,
    player_name: input.player_name,
    position: input.position,
    team: input.team,
    age: input.age,
    bbv_score: Math.min(9999, Math.max(0, Math.round(raw))),
    depth_order: input.depth_chart_order,
    ktc_value: input.ktc_value,
  };
}
