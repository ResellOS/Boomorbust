'use client';

import { forwardRef } from 'react';

export interface CardData {
  player: {
    player_id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    position: string;
    team: string;
    age: number;
    avatar: string;
    dynastyRank: number;
    dynastyRankLabel: string;
  };
  verdict: {
    score: number;
    label: string;
    confidence: number;
    color: string;
  };
  value: {
    edgeScore: number;
    ktcValue: number;
    delta: number;
    signal: 'UNDERVALUED' | 'OVERVALUED' | 'FAIR VALUE';
  };
  momentum: {
    score: number;
    direction: string;
  };
  projections: {
    year: number;
    passingYards?: number;
    passingTDs?: number;
    interceptions?: number;
    rushingYards?: number;
    rushingTDs?: number;
    carries?: number;
    rushingYardsRB?: number;
    rushingTDsRB?: number;
    receptions?: number;
    receivingYards?: number;
    receivingTDs?: number;
    targets?: number;
    receptionsWR?: number;
    receivingYardsWR?: number;
    receivingTDsWR?: number;
    projectedFantasyPoints?: number;
    projectedFinish?: string;
  };
  teamColors: {
    primary: string;
    secondary: string;
  };
}

const POS_COLORS: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

interface StatRow {
  emoji: string;
  value: string | number;
  label: string;
}

function getStatRows(data: CardData): StatRow[] {
  const { position, team } = data.player;
  const p = data.projections;
  const pos = position.toUpperCase();

  if (pos === 'QB') {
    return [
      { emoji: '🏈', value: (p.passingYards ?? 0).toLocaleString(), label: 'PASSING YARDS' },
      { emoji: '🥅', value: p.passingTDs ?? 0, label: 'PASSING TDS' },
      { emoji: '🛡', value: p.interceptions ?? 0, label: 'INTERCEPTIONS' },
      { emoji: '👟', value: (p.rushingYards ?? 0).toLocaleString(), label: 'RUSHING YARDS' },
      { emoji: '🏃', value: p.rushingTDs ?? 0, label: 'RUSHING TDS' },
    ];
  }
  if (pos === 'RB') {
    const totalTDs = (p.rushingTDsRB ?? 0) + (p.receivingTDs ?? 0);
    return [
      { emoji: '🏃', value: p.carries ?? 0, label: 'CARRIES' },
      { emoji: '👟', value: (p.rushingYardsRB ?? 0).toLocaleString(), label: 'RUSHING YARDS' },
      { emoji: '🏈', value: p.receptions ?? 0, label: 'RECEPTIONS' },
      { emoji: '📊', value: (p.receivingYards ?? 0).toLocaleString(), label: 'REC YARDS' },
      { emoji: '🎯', value: totalTDs, label: 'TOTAL TDS' },
    ];
  }
  // WR / TE
  void team;
  return [
    { emoji: '🎯', value: p.targets ?? 0, label: 'TARGETS' },
    { emoji: '🏈', value: p.receptionsWR ?? 0, label: 'RECEPTIONS' },
    { emoji: '📊', value: (p.receivingYardsWR ?? 0).toLocaleString(), label: 'REC YARDS' },
    { emoji: '🏆', value: p.receivingTDsWR ?? 0, label: 'RECEIVING TDS' },
    { emoji: '⚡', value: p.projectedFinish ?? '—', label: 'PROJECTED FINISH' },
  ];
}

interface CardCanvasProps {
  data: CardData;
  className?: string;
}

const CardCanvas = forwardRef<HTMLDivElement, CardCanvasProps>(({ data, className = '' }, ref) => {
  const posColor = POS_COLORS[data.player.position.toUpperCase()] ?? '#22D3EE';
  const posRgb = hexToRgb(posColor);
  const teamPrimaryRgb = hexToRgb(data.teamColors.primary.startsWith('#') ? data.teamColors.primary : '#1e293b');
  const teamSecRgb = hexToRgb(data.teamColors.secondary.startsWith('#') ? data.teamColors.secondary : '#475569');
  const verdictColor = data.verdict.color;
  const statRows = getStatRows(data);

  const signalColor =
    data.value.signal === 'UNDERVALUED' ? '#36E7A1' :
    data.value.signal === 'OVERVALUED' ? '#EF4444' : '#94A3B8';

  const deltaSign = data.value.delta >= 0 ? '+' : '';
  const deltaColor = data.value.delta >= 0 ? '#36E7A1' : '#EF4444';

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: 800,
        height: 1200,
        position: 'relative',
        backgroundColor: '#0a0d14',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Speed lines background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 60px,
            rgba(255,255,255,0.018) 60px,
            rgba(255,255,255,0.018) 61px
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Team primary glow — left center */}
      <div
        style={{
          position: 'absolute',
          left: -100,
          top: '30%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${teamPrimaryRgb},0.22) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Team secondary glow — top right */}
      <div
        style={{
          position: 'absolute',
          right: -60,
          top: -60,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${teamSecRgb},0.14) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Player photo — left 58% */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '58%',
          height: 'calc(100% - 140px)',
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.player.avatar}
          alt={data.player.full_name}
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
          }}
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = 'none';
          }}
        />
        {/* Photo gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              transparent 40%,
              rgba(10,13,20,0.6) 65%,
              rgba(10,13,20,0.97) 100%
            ), linear-gradient(
              to right,
              transparent 0%,
              transparent 60%,
              rgba(10,13,20,0.5) 100%
            )`,
          }}
        />
        {/* Position color edge glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, transparent 85%, rgba(${posRgb},0.08) 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Verdict badge — top right */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 180,
          height: 48,
          borderRadius: 24,
          background: `rgba(${posRgb},0.18)`,
          border: `1px solid rgba(${posRgb},0.55)`,
          boxShadow: `0 0 20px rgba(${posRgb},0.38)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '0.06em' }}>
          {data.verdict.label === 'BOOM' ? '🟢 ' : data.verdict.label === 'BUST' ? '🔴 ' : ''}
          {data.verdict.label}
        </span>
      </div>

      {/* Verdict score */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 20,
          textAlign: 'right',
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            color: verdictColor,
            letterSpacing: '0.06em',
          }}
        >
          VERDICT SCORE: {data.verdict.score}
        </span>
      </div>

      {/* Player name block — bottom left of photo area */}
      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: 160,
          zIndex: 10,
          maxWidth: 420,
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}
        >
          {data.player.first_name}
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: 58,
            fontWeight: 900,
            fontStyle: 'italic',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            textShadow: `0 0 40px rgba(${posRgb},0.5)`,
          }}
        >
          {data.player.last_name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          <span
            style={{
              color: posColor,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {data.player.position}
          </span>
          <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>•</span>
          <span
            style={{
              color: '#94A3B8',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {data.player.team}
          </span>
          <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>•</span>
          <span style={{ color: '#64748B', fontSize: 12 }}>Age {data.player.age}</span>
        </div>
        {data.player.dynastyRankLabel && (
          <div
            style={{
              color: '#475569',
              fontSize: 11,
              marginTop: 4,
              letterSpacing: '0.06em',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {data.player.dynastyRankLabel}
          </div>
        )}
      </div>

      {/* Team logo — bottom right of photo area */}
      <div
        style={{
          position: 'absolute',
          left: '56%',
          bottom: 152,
          zIndex: 10,
          width: 72,
          height: 72,
          transform: 'translateX(-50%)',
          opacity: 0.82,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://sleepercdn.com/images/team_logos/nfl/${data.player.team?.toLowerCase()}.jpg`}
          alt={data.player.team}
          crossOrigin="anonymous"
          width={72}
          height={72}
          style={{ width: 72, height: 72, objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Stats panel — right 42% */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '42%',
          height: 'calc(100% - 140px)',
          background: 'rgba(255,255,255,0.025)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px 20px',
          backdropFilter: 'blur(12px)',
          zIndex: 5,
        }}
      >
        {/* Year label */}
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12,
            color: '#36E7A1',
            letterSpacing: '0.1em',
            marginBottom: 20,
            textTransform: 'uppercase',
          }}
        >
          {data.projections.year} Projected
        </div>

        {/* Stat rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {statRows.map((row, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 10 }}>
                <span style={{ fontSize: 18, width: 24 }}>{row.emoji}</span>
                <div>
                  <div
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 34,
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {row.value}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: '#475569',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    {row.label}
                  </div>
                </div>
              </div>
              {i < statRows.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginLeft: 34 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          height: 80,
          background: 'rgba(0,0,0,0.38)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          zIndex: 20,
        }}
      >
        {/* Confidence */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: '#64748B',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ {data.verdict.confidence}% MODEL CONFIDENCE
          </span>
        </div>

        {/* Center: value display */}
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#36E7A1' }}>EDGE: {data.value.edgeScore.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: '#22D3EE' }}>KTC: {data.value.ktcValue.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color: deltaColor }}>{deltaSign}{data.value.delta.toLocaleString()}</span>
        </div>

        {/* Signal badge */}
        <div style={{ flexShrink: 0 }}>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              fontWeight: 700,
              color: signalColor,
              background: `${signalColor}18`,
              border: `1px solid ${signalColor}40`,
              borderRadius: 99,
              padding: '3px 10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {data.value.signal}
          </span>
        </div>
      </div>

      {/* BOB logo strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: '#050709',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          zIndex: 20,
          boxShadow: '0 -8px 32px rgba(54,231,161,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ color: '#36E7A1' }}>B</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          <span style={{ color: '#A78BFA' }}>B</span>
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          BOOM OR BUST
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.08em',
          }}
        >
          · boomorbust.app
        </span>
      </div>
    </div>
  );
});

CardCanvas.displayName = 'CardCanvas';
export default CardCanvas;
