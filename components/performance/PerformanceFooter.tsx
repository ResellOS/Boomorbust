import Link from 'next/link';

export default function PerformanceFooter() {
  return (
    <footer
      className="grid h-7 border-t border-border/50 bg-bg/[0.98]"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
    >
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px] text-[10px] text-muted">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-hold" />
        Tracking starts Week 1, 2026
      </div>
      <div className="flex h-full items-center border-r border-border/40 px-[18px] text-[10px] text-muted">
        Definitions locked pre-season
      </div>
      <div className="flex h-full items-center px-[18px] text-[10px]">
        <Link href="/performance" className="text-muted no-underline hover:text-boom">
          BOB Record →
        </Link>
      </div>
    </footer>
  );
}
