// Dynasty MARKET value (KTC scale, ~0–11,000) of rookie draft picks.
//
// Trade fairness is judged on market value, not TFO. TFO is a 0–100 talent grade
// that badly misprices trade value — e.g. Tua grades ~88 but the market values
// him ~860, while Ja'Marr Chase grades ~85 and is worth ~9,700. Summing TFO made
// lopsided pick-for-player deals look "fair"; market value fixes that.
//
// Centralised so the calculator and the opportunity pre-fill agree on pick value.

// Base value of a *this-year* rookie pick by round.
const PICK_KTC_BASE: Record<number, number> = { 1: 5200, 2: 2800, 3: 1400, 4: 650 };
// Future rookie picks are worth less than the same round this year (per year out).
const PICK_YEAR_FACTOR = [1, 0.82, 0.66, 0.5];

// Talent-grade weight of a pick — kept only for the secondary TFO readout.
export const PICK_TFO: Record<number, number> = { 1: 70, 2: 55, 3: 40, 4: 25 };

/** Extract a 4-digit draft year from a pick label like "2027 1st (own)". */
export function parsePickYear(label: string): number | null {
  const m = label.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/** Best-effort round from a free-text pick label ("2027 1st Round Pick" → 1). */
export function pickRoundFromLabel(label: string): number {
  if (/\b1st\b/i.test(label)) return 1;
  if (/\b2nd\b/i.test(label)) return 2;
  if (/\b3rd\b/i.test(label)) return 3;
  if (/\b4th\b/i.test(label)) return 4;
  return 3;
}

/** Market (KTC-scale) value of a rookie pick, discounted for how far out it is. */
export function pickMarketValue(round: number, year: number | null): number {
  const base = PICK_KTC_BASE[round] ?? 400;
  const yearsOut = year != null ? Math.max(0, year - new Date().getFullYear()) : 0;
  const factor = PICK_YEAR_FACTOR[Math.min(yearsOut, PICK_YEAR_FACTOR.length - 1)] ?? 0.5;
  return Math.round(base * factor);
}
