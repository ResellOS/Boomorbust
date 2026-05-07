'use client';

import { useEffect, useState, type CSSProperties, type RefObject, type Ref } from 'react';
import type { ProjectionCardData } from '@/app/api/cards/projection/route';

/** Monospace stack — JetBrains Mono is loaded globally via next/font (see layout). */
const MONO = "'JetBrains Mono', monospace" as const;

const SHARE_SITE = 'https://thefrontoffice.app';

const FLAG_STYLES: Record<
  string,
  { label: string; box: CSSProperties }
> = {
  AGE_CLIFF: {
    label: 'AGE RISK',
    box: {
      background: 'rgba(251,191,36,0.12)',
      color: '#FBBF24',
      border: '1px solid rgba(251,191,36,0.25)',
    },
  },
  SCHEME_MISMATCH: {
    label: 'SCHEME RISK',
    box: {
      background: 'rgba(239,68,68,0.12)',
      color: '#EF4444',
      border: '1px solid rgba(239,68,68,0.25)',
    },
  },
  NEW_OC: {
    label: 'NEW OC',
    box: {
      background: 'rgba(251,191,36,0.12)',
      color: '#FBBF24',
      border: '1px solid rgba(251,191,36,0.25)',
    },
  },
  ELITE_OPPORTUNITY: {
    label: 'ELITE OPP',
    box: {
      background: 'rgba(54,231,161,0.12)',
      color: '#36E7A1',
      border: '1px solid rgba(54,231,161,0.25)',
    },
  },
  RZ_MONSTER: {
    label: 'RZ MONSTER',
    box: {
      background: 'rgba(54,231,161,0.12)',
      color: '#36E7A1',
      border: '1px solid rgba(54,231,161,0.25)',
    },
  },
  WEAK_SUPPORT: {
    label: 'WEAK CAST',
    box: {
      background: 'rgba(148,163,184,0.12)',
      color: '#94A3B8',
      border: '1px solid rgba(148,163,184,0.25)',
    },
  },
};

export interface ProjectionCardProps {
  data: ProjectionCardData;
  playerImageUrl?: string;
  teamLogoUrl?: string;
  showShareButton?: boolean;
  cardRef?: RefObject<HTMLDivElement | null>;
  onShare?: () => void;
}

export default function ProjectionCard({
  data,
  playerImageUrl,
  teamLogoUrl,
  showShareButton = true,
  cardRef,
  onShare,
}: ProjectionCardProps) {
  const [imgBroken, setImgBroken] = useState(false);
  const barPct = Math.max(0, Math.min(100, data.startScore));

  useEffect(() => {
    setImgBroken(false);
  }, [playerImageUrl, data.playerId]);

  const matchupColor = data.matchupLabel === 'BYE' ? '#EF4444' : '#94A3B8';

  const matchupValueColor =
    data.matchupGrade >= 70 ? '#36E7A1' : data.matchupGrade >= 50 ? '#FBBF24' : '#EF4444';

  const posAbbrev = (data.position || '?').slice(0, 3).toUpperCase();

  function shareDefault() {
    const tweetText = encodeURIComponent(data.caption);
    const tweetUrl = encodeURIComponent(SHARE_SITE);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`, '_blank', 'noopener,noreferrer');
  }

  const showPhoto = Boolean(playerImageUrl) && !imgBroken;

  return (
    <div
      ref={cardRef as Ref<HTMLDivElement> | undefined}
      className="overflow-hidden"
      style={{
        width: 480,
        background: '#060910',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        fontFamily: 'var(--font-body)',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          background: 'rgba(13,17,23,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 16px',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-full2.png"
            alt="Boom or Bust"
            className="inline-block shrink-0 object-contain object-left"
            style={{ height: 24, width: 'auto', maxWidth: 140 }}
          />
          <span
            className="truncate text-lg uppercase tracking-[0.12em] text-white leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            BOOM OR BUST
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: MONO,
            color: '#94A3B8',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          WEEK {data.week} · {data.position}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* Player row */}
        <div className="flex flex-row" style={{ gap: 12 }}>
          <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerImageUrl}
                alt=""
                width={72}
                height={72}
                crossOrigin="anonymous"
                className="rounded-full object-cover"
                style={{
                  width: 72,
                  height: 72,
                  border: `2px solid ${data.verdictColor}`,
                  boxShadow: `0 0 16px ${data.verdictColor}40`,
                }}
                onError={() => setImgBroken(true)}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full font-bold"
                style={{
                  width: 72,
                  height: 72,
                  background: `${data.gradeColor}20`,
                  color: data.gradeColor,
                  fontSize: 20,
                  border: `2px solid ${data.verdictColor}`,
                  boxShadow: `0 0 16px ${data.verdictColor}40`,
                  fontFamily: MONO,
                }}
              >
                {posAbbrev}
              </div>
            )}
            {teamLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={teamLogoUrl}
                alt=""
                width={24}
                height={24}
                crossOrigin="anonymous"
                className="absolute object-contain bg-black/40"
                style={{
                  width: 24,
                  height: 24,
                  bottom: -4,
                  right: -4,
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.5)',
                }}
              />
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h2
              className="truncate font-bold text-white"
              style={{ fontSize: 22, lineHeight: 1.1, fontFamily: 'var(--font-body)' }}
            >
              {data.playerName}
            </h2>
            <p
              style={{
                fontSize: 11,
                fontFamily: MONO,
                color: '#64748B',
                letterSpacing: '0.06em',
                marginTop: 2,
              }}
            >
              {data.position} · {data.team}
            </p>
            <p
              style={{
                fontSize: 12,
                color: matchupColor,
                marginTop: 4,
                fontFamily: 'var(--font-body)',
              }}
            >
              {data.matchupLabel} {data.weatherIcon} {data.weatherTemp}°F
            </p>
          </div>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-3" style={{ gap: 8, marginTop: 14 }}>
          {[
            {
              label: 'TFO SCORE',
              value: String(Math.round(data.tfoScore)),
              sub: data.grade.replace(/_/g, ' '),
              valueColor: data.gradeColor,
            },
            {
              label: 'PROJECTED',
              value: `${data.projLow}–${data.projHigh}`,
              sub: 'pts',
              valueColor: '#ffffff',
            },
            {
              label: 'MATCHUP',
              value: String(Math.round(data.matchupGrade)),
              sub: '/100',
              valueColor: matchupValueColor,
            },
          ].map((box) => (
            <div
              key={box.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontFamily: MONO,
                  color: '#64748B',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {box.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: MONO,
                  lineHeight: 1,
                  color: box.valueColor,
                }}
              >
                {box.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#64748B',
                  marginTop: 2,
                  fontFamily: MONO,
                }}
              >
                {box.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Lineup score bar */}
        <div style={{ marginTop: 14 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 9,
                color: '#64748B',
                fontFamily: MONO,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              LINEUP SCORE
            </span>
            <span
              style={{
                fontSize: 11,
                color: data.verdictColor,
                fontFamily: MONO,
                fontWeight: 600,
              }}
            >
              {data.startScore}/100
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${barPct}%`,
                background: `linear-gradient(90deg, ${data.verdictColor}, ${data.verdictColor}88)`,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Verdict */}
        <div
          style={{
            marginTop: 12,
            background: `${data.verdictColor}14`,
            border: `1px solid ${data.verdictColor}38`,
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: 9,
                fontFamily: MONO,
                fontWeight: 700,
                color: data.verdictColor,
                letterSpacing: '0.1em',
              }}
            >
              VERDICT
            </span>
            <span style={{ color: '#475569' }}>·</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: data.verdictColor,
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-body)',
              }}
            >
              {data.verdict}
            </span>
          </div>
          <p
            className="line-clamp-2 mt-1.5 text-xs leading-snug text-[#94A3B8]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {data.reasoning}
          </p>
        </div>

        {/* Flags */}
        {data.flags.length > 0 ? (
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
            {data.flags.slice(0, 3).map((f) => {
              const fs = FLAG_STYLES[f];
              return (
                <span
                  key={f}
                  style={{
                    fontSize: 9,
                    fontFamily: MONO,
                    padding: '3px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    ...(fs?.box ?? {
                      background: 'rgba(148,163,184,0.12)',
                      color: '#94A3B8',
                      border: '1px solid rgba(148,163,184,0.25)',
                    }),
                  }}
                >
                  {fs?.label ?? f}
                </span>
              );
            })}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: '#475569',
              letterSpacing: '0.05em',
            }}
          >
            {data.brandTag}
          </span>
          {showShareButton ? (
            <button
              type="button"
              onClick={() => (onShare ? onShare() : shareDefault())}
              className="transition-colors duration-150 ease-out hover:!bg-[rgba(255,255,255,0.1)] hover:!text-white"
              style={{
                fontSize: 11,
                fontFamily: MONO,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              Share on 𝕏
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
