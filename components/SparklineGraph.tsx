'use client';

interface SparklineGraphProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

function trendColor(points: number[], override?: string): string {
  if (override) return override;
  if (points.length < 2) return '#64748B';
  const a = points[0]!;
  const b = points[points.length - 1]!;
  if (b > a) return '#10B981';
  if (b < a) return '#EF4444';
  return '#64748B';
}

function pathForPoints(points: number[], width: number, height: number, pad = 4): { line: string; area: string; lastX: number; lastY: number } {
  if (points.length === 0) return { line: '', area: '', lastX: width / 2, lastY: height / 2 };
  const min = Math.min(...points);
  const max = Math.max(...points);
  const rng = Math.max(max - min, 1e-6);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const xs = points.map((_, i) => pad + (i / Math.max(points.length - 1, 1)) * innerW);
  const ys = points.map((v) => pad + innerH - ((v - min) / rng) * innerH);

  const simpleLine = points.map((_, i) => (i === 0 ? `M ${xs[i]} ${ys[i]}` : `L ${xs[i]} ${ys[i]}`)).join(' ');

  const lastX = xs[xs.length - 1]!;
  const lastY = ys[ys.length - 1]!;
  const area = `${simpleLine} L ${lastX} ${height - pad} L ${pad} ${height - pad} Z`;

  return { line: simpleLine, area, lastX, lastY };
}

export default function SparklineGraph({
  data,
  width = 80,
  height = 40,
  color,
  className = '',
}: SparklineGraphProps) {
  const points = data.length >= 2 ? data : [...data, ...(data.length === 1 ? [data[0]!] : [0, 0])];
  const stroke = trendColor(points, color);
  const { line, area, lastX, lastY } = pathForPoints(points, width, height);

  const gradId = `spark-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={stroke} />
    </svg>
  );
}
