/**
 * Procedural lightning engine — recursive midpoint displacement.
 * Pure canvas drawing, no DOM/React dependencies.
 */

export interface BoltSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Branch segments render dimmer than the main channel. */
  branch: boolean;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a bolt's segments via recursive midpoint displacement.
 * Displacement shrinks with recursion depth, which is what makes
 * it look like real lightning instead of a zigzag.
 */
export function generateBolt(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  branches: number,
  maxBranches: number = branches,
  out: BoltSegment[] = [],
  isBranch = false,
): BoltSegment[] {
  const length = Math.hypot(x2 - x1, y2 - y1);

  if (branches <= 0 || length < 12) {
    out.push({ x1, y1, x2, y2, branch: isBranch });
    return out;
  }

  // Midpoint, displaced perpendicular to the segment
  let midX = (x1 + x2) / 2;
  let midY = (y1 + y2) / 2;
  const displacement = rand(-80, 80) * (branches / maxBranches);
  midX += (-(y2 - y1) * displacement) / length;
  midY += ((x2 - x1) * displacement) / length;

  generateBolt(x1, y1, midX, midY, branches - 1, maxBranches, out, isBranch);
  generateBolt(midX, midY, x2, y2, branches - 1, maxBranches, out, isBranch);

  // Random chance to spawn a forking branch off the midpoint,
  // biased to continue in the bolt's direction of travel.
  if (Math.random() < 0.3 && branches >= 2) {
    const dirX = (x2 - x1) / length;
    const dirY = (y2 - y1) / length;
    const branchEndX = midX + dirX * rand(50, 200) + rand(-150, 150) * 0.45;
    const branchEndY = midY + dirY * rand(50, 200) + rand(-150, 150) * 0.45;
    generateBolt(midX, midY, branchEndX, branchEndY, branches - 2, maxBranches, out, true);
  }

  return out;
}

const PASSES = [
  { stroke: '#ffffff', width: 3, opacity: 0.9 },
  { stroke: 'COLOR', width: 1.5, opacity: 0.7 },
  { stroke: '#ffffff', width: 0.5, opacity: 0.5 },
] as const;

/**
 * Render bolt segments with the 3-pass channel effect:
 * wide white flash → colored channel → bright thin core.
 *
 * @param alpha  overall opacity multiplier (for fade-out)
 * @param reveal 0–1 fraction of segments drawn (for draw-in animation)
 */
export function renderBolt(
  ctx: CanvasRenderingContext2D,
  segments: BoltSegment[],
  color: string,
  alpha = 1,
  reveal = 1,
): void {
  if (alpha <= 0 || segments.length === 0) return;
  const count = Math.max(1, Math.ceil(segments.length * Math.min(1, reveal)));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;

  for (const pass of PASSES) {
    ctx.strokeStyle = pass.stroke === 'COLOR' ? color : pass.stroke;
    ctx.lineWidth = pass.width;

    // Main channel
    ctx.globalAlpha = pass.opacity * alpha;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const s = segments[i];
      if (s.branch) continue;
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.stroke();

    // Branches — dimmer
    ctx.globalAlpha = pass.opacity * alpha * 0.4;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const s = segments[i];
      if (!s.branch) continue;
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * One-shot convenience: generate and immediately draw a bolt with
 * 2 slightly offset channels for the flicker-y "channel" look.
 */
export function drawLightning(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  branches: number,
  color: string,
): void {
  const main = generateBolt(x1, y1, x2, y2, branches);
  renderBolt(ctx, main, color, 1, 1);
  const echo = generateBolt(x1 + rand(-6, 6), y1, x2 + rand(-6, 6), y2, branches);
  renderBolt(ctx, echo, color, 0.35, 1);
}
