'use client';

import type { WeatherAlert, WeatherIcon } from './types';

interface Props {
  alerts: WeatherAlert[];
  loading: boolean;
}

function RainIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 5C12.13 5 9 8.13 9 12c0 .5.06.98.15 1.44L8 13.44A4 4 0 108 21h16a4 4 0 000-8h-.15C23.94 12.98 24 12.5 24 12c0-3.87-3.13-7-7-7z"
        fill="#60a5fa" opacity="0.7"
      />
      <line x1="11" y1="24" x2="9.5" y2="28" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="24" x2="14.5" y2="28" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <line x1="21" y1="24" x2="19.5" y2="28" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 5C12.13 5 9 8.13 9 12c0 .5.06.98.15 1.44L8 13.44A4 4 0 108 21h16a4 4 0 000-8h-.15C23.94 12.98 24 12.5 24 12c0-3.87-3.13-7-7-7z"
        fill="#bfdbfe" opacity="0.7"
      />
      <circle cx="11" cy="25" r="1.5" fill="#bfdbfe"/>
      <circle cx="16" cy="25" r="1.5" fill="#bfdbfe"/>
      <circle cx="21" cy="25" r="1.5" fill="#bfdbfe"/>
      <circle cx="13.5" cy="27.5" r="1" fill="#93c5fd" opacity="0.7"/>
      <circle cx="18.5" cy="27.5" r="1" fill="#93c5fd" opacity="0.7"/>
    </svg>
  );
}

function WindIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 13h18a4 4 0 000-8 4 4 0 00-4 4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 19h12a4 4 0 010 8 4 4 0 01-4-4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 16h22" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 5C12.13 5 9 8.13 9 12c0 .5.06.98.15 1.44L8 13.44A4 4 0 108 21h16a4 4 0 000-8h-.15C23.94 12.98 24 12.5 24 12c0-3.87-3.13-7-7-7z"
        fill="#36E7A1" opacity="0.8"
      />
    </svg>
  );
}

function WeatherIconComponent({ icon }: { icon: WeatherIcon }) {
  switch (icon) {
    case 'RAIN': return <RainIcon />;
    case 'SNOW': return <SnowIcon />;
    case 'WIND': return <WindIcon />;
    default:     return <ClearIcon />;
  }
}

function iconStyle(icon: WeatherIcon): { bg: string; border: string; label: string; labelColor: string } {
  switch (icon) {
    case 'RAIN': return { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)', label: 'RAIN', labelColor: '#FBBF24' };
    case 'SNOW': return { bg: 'rgba(147,197,253,0.06)', border: 'rgba(147,197,253,0.2)', label: 'SNOW', labelColor: '#93c5fd' };
    case 'WIND': return { bg: 'rgba(156,163,175,0.06)', border: 'rgba(156,163,175,0.2)', label: 'WIND', labelColor: '#9ca3af' };
    default:     return { bg: 'rgba(54,231,161,0.06)', border: 'rgba(54,231,161,0.2)', label: 'CLEAR', labelColor: '#36E7A1' };
  }
}

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const style = iconStyle(alert.icon);
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-4"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <WeatherIconComponent icon={alert.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[14px] font-bold text-white truncate">{alert.game}</p>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ color: style.labelColor, background: `${style.border}`, border: `1px solid ${style.border}` }}
          >
            {style.label}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-1">{alert.stadium}</p>
        <p className="text-[12px] text-slate-300">{alert.conditions}</p>
        <p className="text-[11px] mt-1" style={{ color: style.labelColor }}>
          Impact: {alert.impact}
        </p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 border border-white/[0.06] animate-pulse">
      <div className="flex gap-4">
        <div className="w-8 h-8 bg-white/[0.06] rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/[0.06] rounded w-3/4" />
          <div className="h-3 bg-white/[0.06] rounded w-1/2" />
          <div className="h-3 bg-white/[0.06] rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function WeatherAlertsTab({ alerts, loading }: Props) {
  return (
    <div className="glass-card p-4">
      <h2 className="text-[13px] font-bold text-white tracking-wide mb-4">WEATHER ALERTS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading
          ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          : alerts.length === 0
            ? (
              <div className="col-span-2 text-center py-10 text-slate-500 text-[13px]">
                No weather concerns this week — all games look clean
              </div>
            )
            : alerts.map((a, i) => <AlertCard key={i} alert={a} />)
        }
      </div>
    </div>
  );
}
