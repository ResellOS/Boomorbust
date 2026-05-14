'use client';

export default function TradeHubPageHeader() {
  return (
    <header className="mb-0">
      <h1
        className="text-[26px] font-bold leading-tight text-white sm:text-[32px] sm:leading-none"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        Trade Hub
      </h1>
      <p
        className="mt-1 text-[14px] text-[#64748B]"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        All trades. All leagues. One hub.
      </p>
    </header>
  );
}
