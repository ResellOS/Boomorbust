import { formatTimeAgo } from '@/lib/utils/format';

// Small "· Updated Xago" freshness badge for section headers. Colors by age:
//   < 1h text-boom · 1–6h text-muted · 6–24h text-hold · > 24h text-bust
// Renders nothing when no real timestamp is available (never fabricates one).
export default function FreshnessBadge({
  timestamp,
  label = 'Updated',
}: {
  timestamp?: string | number | Date | null;
  label?: string;
}) {
  if (timestamp == null) return null;
  const t = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  if (!Number.isFinite(t)) return null;

  const hours = (Date.now() - t) / 3_600_000;
  const color =
    hours < 1 ? 'text-boom' : hours < 6 ? 'text-muted' : hours < 24 ? 'text-hold' : 'text-bust';

  return (
    <span className={`ml-1.5 font-mono text-[9px] normal-case ${color}`}>
      · {label} {formatTimeAgo(timestamp)}
    </span>
  );
}
