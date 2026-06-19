const FEED_LINES = [
  'BOB SCORE UPDATE · JALEN HURTS +2.1',
  'MARKET SIGNAL · MCBRIDE BUY WINDOW',
  'LEAGUE SYNC · BLUE LEAGUE 22/22',
  'TRADE OPPORTUNITY · +63% ACCEPTANCE',
  'DYNASTY RATING · 537 PLAYERS SCORED',
  'VALUE SIGNAL · MARKET CORRECTION DETECTED',
  'ENGINE STATUS · OPTIMAL',
];

const FEED_CSS = `
@keyframes login-feed-scroll {
  0% { transform: translateY(0) translateX(0); }
  100% { transform: translateY(-50%) translateX(12px); }
}
.login-data-feed-track {
  animation: login-feed-scroll 60s linear infinite;
}
`;

export default function DataFeedBackground() {
  const lines = [...FEED_LINES, ...FEED_LINES];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ zIndex: 2 }}
        aria-hidden
      >
        <div className="login-data-feed-track absolute inset-x-0 top-0 flex flex-col gap-6 px-6 py-8">
          {lines.map((line, i) => (
            <div
              key={`${line}-${i}`}
              className="whitespace-nowrap font-mono text-[10px] tracking-wide sm:text-[11px]"
              style={{
                color: '#36E7A1',
                opacity: 0.04 + (i % 3) * 0.008,
                paddingLeft: `${(i % 5) * 24}px`,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
