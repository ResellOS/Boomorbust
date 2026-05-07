export type Tier = 'elite' | 'solid' | 'depth' | 'stash';
export type Trend = 'rising' | 'stable' | 'declining';

export interface DynastyScore {
  value: number;
  tier: Tier;
  trend: Trend;
  age_curve_note: string;
}

function getTier(value: number): Tier {
  if (value >= 7000) return 'elite';
  if (value >= 4000) return 'solid';
  if (value >= 1500) return 'depth';
  return 'stash';
}

function getTrend(position: string, age: number | null): Trend {
  if (!age) return 'stable';
  const pos = position.toUpperCase();

  if (pos === 'QB') return age < 26 ? 'rising' : age <= 32 ? 'stable' : 'declining';
  if (pos === 'RB') return age < 24 ? 'rising' : age <= 26 ? 'stable' : 'declining';
  if (pos === 'WR') return age < 25 ? 'rising' : age <= 28 ? 'stable' : 'declining';
  if (pos === 'TE') return age < 26 ? 'rising' : age <= 29 ? 'stable' : 'declining';
  return 'stable';
}

function getAgeCurveNote(position: string, age: number | null, trend: Trend): string {
  if (!age) return 'Age unknown';
  const pos = position.toUpperCase();

  if (trend === 'rising') {
    if (pos === 'RB' && age <= 22) return 'Entering prime — peak value ahead';
    return 'Peak years ahead';
  }
  if (trend === 'declining') {
    if (pos === 'RB') return 'Past typical RB peak — monitor closely';
    return 'Entering decline phase';
  }
  return 'Prime window now';
}

export function calculatePlayerDynastyScore(
  player: { position: string; age: number | null },
  ktc_value: number
): DynastyScore {
  const tier = getTier(ktc_value);
  const trend = getTrend(player.position, player.age);
  const age_curve_note = getAgeCurveNote(player.position, player.age, trend);

  return { value: ktc_value, tier, trend, age_curve_note };
}

// ── Trade analyzer ──────────────────────────────────────────────────────────

export type TradeVerdict = 'ACCEPT' | 'FAIR' | 'DECLINE';

export interface TradeDimension {
  score: number; // -100 to +100
  note: string;
}

export interface TradeAnalysis {
  verdict: TradeVerdict;
  value_delta: number;
  explanation: string;
  dimensions: {
    current_value: TradeDimension;
    future_value: TradeDimension;
    positional_need: TradeDimension;
    age_curve: TradeDimension;
  };
  why_bullets: string[];
}

export interface TradeSide {
  players: Array<{
    name: string;
    position: string;
    age: number | null;
    ktc_value: number;
  }>;
}

export interface RosterContext {
  positions: Record<string, number>; // position -> count of starters
  scoringFormat?: string;
  riskTolerance?: 'conservative' | 'balanced' | 'aggressive';
}

export function analyzeTradeOffer(
  giving: TradeSide,
  receiving: TradeSide,
  myRoster: RosterContext
): TradeAnalysis {
  const givingTotal = giving.players.reduce((s, p) => s + p.ktc_value, 0);
  const receivingTotal = receiving.players.reduce((s, p) => s + p.ktc_value, 0);
  const value_delta = receivingTotal - givingTotal;

  // current_value: normalize delta to -100/+100
  const maxDelta = Math.max(givingTotal, receivingTotal, 1);
  const cvScore = Math.round(Math.max(-100, Math.min(100, (value_delta / maxDelta) * 100)));
  const cvNote =
    cvScore > 15
      ? `You gain ~${value_delta} KTC points on face value`
      : cvScore < -15
      ? `You give up ~${Math.abs(value_delta)} KTC points on face value`
      : 'Roughly even on current value';

  // future_value: rising players are worth more than face value; declining worth less
  const risingBonus = (side: TradeSide) =>
    side.players.reduce((s, p) => {
      const t = getTrend(p.position, p.age);
      return s + (t === 'rising' ? p.ktc_value * 0.15 : t === 'declining' ? -p.ktc_value * 0.1 : 0);
    }, 0);

  const fvDelta = risingBonus(receiving) - risingBonus(giving);
  const fvScore = Math.round(Math.max(-100, Math.min(100, (fvDelta / Math.max(maxDelta * 0.15, 1)) * 100)));
  const risersReceiving = receiving.players.filter((p) => getTrend(p.position, p.age) === 'rising');
  const fvNote =
    fvScore > 10 && risersReceiving.length
      ? `${risersReceiving.map((p) => p.name.split(' ').pop()).join(', ')} ${risersReceiving.length > 1 ? 'are' : 'is'} rising — future value likely higher`
      : fvScore < -10
      ? 'Players you receive have limited upside based on age'
      : 'Future value roughly balanced';

  // positional_need: bonus if receiving fills sparse positions
  const posNeed = (side: TradeSide) =>
    side.players.reduce((s, p) => {
      const count = myRoster.positions[p.position] ?? 0;
      return s + (count === 0 ? 20 : count === 1 ? 10 : count >= 3 ? -10 : 0);
    }, 0);
  const pnScore = Math.round(Math.max(-100, Math.min(100, posNeed(receiving) - posNeed(giving))));
  const pnNote =
    pnScore > 10
      ? 'Receiving players fill genuine positional needs'
      : pnScore < -10
      ? 'Adding depth at already strong positions'
      : 'Positional fit is neutral';

  // age_curve: penalty for old players at premium positions
  const agePenalty = (side: TradeSide) =>
    side.players.reduce((s, p) => {
      const pos = p.position.toUpperCase();
      if (!p.age) return s;
      if (pos === 'RB' && p.age > 28) return s - 15;
      if ((pos === 'WR' || pos === 'QB') && p.age > 32) return s - 10;
      return s;
    }, 0);
  const acScore = Math.round(Math.max(-100, Math.min(100, agePenalty(receiving) - agePenalty(giving))));
  const acNote =
    acScore < -10
      ? 'Some players you receive carry age-related risk'
      : acScore > 10
      ? 'Players you receive are in safer age ranges'
      : 'Age curve is balanced on both sides';

  // verdict
  const riskWeight = myRoster.riskTolerance === 'aggressive' ? 1.3 : myRoster.riskTolerance === 'conservative' ? 0.7 : 1;
  const composite = cvScore * 0.4 + fvScore * 0.3 * riskWeight + pnScore * 0.2 + acScore * 0.1;
  const verdict: TradeVerdict = composite > 12 ? 'ACCEPT' : composite < -12 ? 'DECLINE' : 'FAIR';

  const isPPR = myRoster.scoringFormat?.toLowerCase().includes('ppr');
  const explanation =
    `Based on current KTC values, you ${value_delta >= 0 ? 'gain' : 'lose'} ${Math.abs(value_delta)} points of raw value. ` +
    `${fvNote}. ` +
    (isPPR ? `In PPR leagues WRs carry additional value — factor that in if the projection gaps are close. ` : '') +
    `Overall this deal is ${verdict === 'FAIR' ? 'roughly balanced' : verdict === 'ACCEPT' ? 'in your favor' : 'against you'}.`;

  const why_bullets = [
    `Current value (${cvScore > 0 ? '+' : ''}${cvScore}): ${cvNote}`,
    `Future value (${fvScore > 0 ? '+' : ''}${fvScore}): ${fvNote}`,
    `Positional need (${pnScore > 0 ? '+' : ''}${pnScore}): ${pnNote}`,
    `Age curve (${acScore > 0 ? '+' : ''}${acScore}): ${acNote}`,
  ];

  return {
    verdict,
    value_delta,
    explanation,
    dimensions: {
      current_value: { score: cvScore, note: cvNote },
      future_value: { score: fvScore, note: fvNote },
      positional_need: { score: pnScore, note: pnNote },
      age_curve: { score: acScore, note: acNote },
    },
    why_bullets,
  };
}
