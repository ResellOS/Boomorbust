import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0a0d14' }}
    >
      <div className="text-center max-w-md">
        <p
          className="text-[120px] font-bold leading-none tabular-nums"
          style={{
            fontFamily: 'var(--font-display), "Bebas Neue", sans-serif',
            color: '#36E7A1',
            textShadow: '0 0 60px rgba(54,231,161,0.35)',
          }}
        >
          404
        </p>
        <h1
          className="mt-2 text-[22px] font-bold text-white"
          style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
        >
          Page Not Found
        </h1>
        <p
          className="mt-3 text-[14px] text-[#64748B]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          Looks like this play got blown up at the line of scrimmage.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-[#0a0d14] transition hover:opacity-90"
            style={{ background: '#36E7A1', boxShadow: '0 0 20px rgba(54,231,161,0.3)' }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-lg border border-white/[0.15] px-6 text-[14px] font-semibold text-white transition hover:bg-white/[0.04]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
