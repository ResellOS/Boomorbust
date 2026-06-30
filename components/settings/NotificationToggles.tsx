'use client';

import type { ProfileData } from '@/app/api/settings/profile/route';

type Notifs = ProfileData['notifications'];
type NotifKey = keyof Notifs;

interface ToggleProps {
  on:       boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{
        background:  on ? '#36E7A1' : 'rgba(255,255,255,0.12)',
        opacity:     disabled ? 0.5 : 1,
        cursor:      disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  );
}

function ArrowsIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 14l-3-3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function TrendIcon()   { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6M12 5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function DropIcon()    { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L4.5 8a3.5 3.5 0 107 0L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>; }
function BandIcon()    { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3a5 5 0 100 10A5 5 0 008 3zM3.5 8h9M8 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function LineupIcon()  { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function NewspaperIcon(){ return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }

const NOTIF_CONFIG: Array<{ key: NotifKey; label: string; desc: string; icon: React.ReactNode; iconColor: string }> = [
  { key: 'tradeAlerts',     label: 'Trade Alerts',       desc: 'Instant alerts for trade activity',   icon: <ArrowsIcon />,    iconColor: '#36E7A1' },
  { key: 'priceAlerts',     label: 'Price Change Alerts', desc: 'Player value movements',             icon: <TrendIcon />,     iconColor: '#22D3EE' },
  { key: 'waiverAlerts',    label: 'Waiver Alerts',      desc: 'Top waiver adds & drops',             icon: <DropIcon />,      iconColor: '#A78BFA' },
  { key: 'injuryAlerts',    label: 'Injury Alerts',      desc: 'Injury & practice updates',           icon: <BandIcon />,      iconColor: '#EF4444' },
  { key: 'lineupReminders', label: 'Lineup Reminders',   desc: 'Start/Sit & lineup alerts',           icon: <LineupIcon />,    iconColor: '#FBBF24' },
  { key: 'newsUpdates',     label: 'News & Updates',     desc: 'Platform news & features',            icon: <NewspaperIcon />, iconColor: '#64748B' },
];

interface Props {
  notifications: Notifs;
  onChange: (key: NotifKey, value: boolean) => void;
}

export default function NotificationToggles({ notifications, onChange }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">NOTIFICATION PREFERENCES</p>
        <button className="text-[12px] font-medium" style={{ color: '#36E7A1' }}>Manage All</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {NOTIF_CONFIG.map(({ key, label, desc, icon, iconColor }) => (
          <div
            key={key}
            className="flex items-center gap-4 px-5 py-4 border-b sm:even:border-l"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25`, color: iconColor }}
            >
              {icon}
            </div>

            {/* Label + desc */}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white">{label}</p>
              <p className="text-[12px] text-slate-500">{desc}</p>
            </div>

            {/* Toggle */}
            <Toggle
              on={notifications[key]}
              onChange={(v) => onChange(key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
