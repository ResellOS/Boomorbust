'use client';

export type SettingsSection =
  | 'profile'
  | 'dynasty-title'
  | 'league-connections'
  | 'subscription'
  | 'notifications'
  | 'email-preferences'
  | 'push-notifications'
  | 'trade-alerts'
  | 'waiver-alerts'
  | 'data-settings'
  | 'privacy-settings'
  | 'export-data'
  | 'integrations'
  | 'api-access';

interface NavItem {
  id:    SettingsSection;
  label: string;
  icon:  React.ReactNode;
}

interface NavGroup {
  heading: string;
  items:   NavItem[];
}

function ProfileIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function CrownIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 10l2-6 3.5 4L7.5 3l3.5 5L13 4l-1 6H3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function LinkIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 9l3-3M9 5l1-1a2.83 2.83 0 014 4l-2 2a2.83 2.83 0 01-4 0M6 10l-2 2a2.83 2.83 0 01-4-4l2-2a2.83 2.83 0 014 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function CardIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6.5h12" stroke="currentColor" strokeWidth="1.3"/></svg>;
}
function BellIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2a5 5 0 00-5 5v3l-1 1.5h12L12.5 10V7a5 5 0 00-5-5zM6 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function MailIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function PhoneIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="4" y="1.5" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="7.5" cy="11.5" r="0.8" fill="currentColor"/></svg>;
}
function ArrowsIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 5h9M8 2l3 3-3 3M13 10H4M7 13l-3-3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function DropIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L4 7.5a3.5 3.5 0 107 0L7.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function ShieldIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L3 4v4c0 3 2.5 5 4.5 5.5C9.5 13 12 11 12 8V4l-4.5-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function DownloadIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v8M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function PuzzleIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 3h5v2l1.5-.5a1.5 1.5 0 010 3L10 7v2H8l.5 1.5a1.5 1.5 0 01-3 0L6 9H4V7l-1.5.5a1.5 1.5 0 010-3L4 5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>;
}
function KeyIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 8.5l5 5M10 11l1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M9 2H4a1 1 0 00-1 1v9a1 1 0 001 1h5M10 5l3 2.5L10 10M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'ACCOUNT',
    items: [
      { id: 'profile',            label: 'Profile Overview',      icon: <ProfileIcon /> },
      { id: 'dynasty-title',      label: 'Dynasty Title',         icon: <CrownIcon /> },
      { id: 'league-connections', label: 'League Connections',    icon: <LinkIcon /> },
      { id: 'subscription',       label: 'Subscription & Billing',icon: <CardIcon /> },
    ],
  },
  {
    heading: 'PREFERENCES',
    items: [
      { id: 'notifications',      label: 'Notifications',         icon: <BellIcon /> },
      { id: 'email-preferences',  label: 'Email Preferences',     icon: <MailIcon /> },
      { id: 'push-notifications', label: 'Push Notifications',    icon: <PhoneIcon /> },
      { id: 'trade-alerts',       label: 'Trade Alerts',          icon: <ArrowsIcon /> },
      { id: 'waiver-alerts',      label: 'Waiver Alerts',         icon: <DropIcon /> },
    ],
  },
  {
    heading: 'DATA & PRIVACY',
    items: [
      { id: 'data-settings',   label: 'Data Settings',    icon: <ShieldIcon /> },
      { id: 'privacy-settings',label: 'Privacy Settings', icon: <ShieldIcon /> },
      { id: 'export-data',     label: 'Export My Data',   icon: <DownloadIcon /> },
    ],
  },
  {
    heading: 'OTHER',
    items: [
      { id: 'integrations', label: 'Integrations', icon: <PuzzleIcon /> },
      { id: 'api-access',   label: 'API Access',   icon: <KeyIcon /> },
    ],
  },
];

interface Props {
  active:   SettingsSection;
  onChange: (s: SettingsSection) => void;
  onLogout: () => void;
}

export default function SettingsNav({ active, onChange, onLogout }: Props) {
  return (
    <nav className="flex flex-col gap-5 py-4 px-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1.5">{group.heading}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all relative"
                  style={{
                    background: isActive ? 'rgba(54,231,161,0.08)' : 'transparent',
                    color:      isActive ? '#36E7A1' : '#94a3b8',
                    borderLeft: isActive ? '2px solid #36E7A1' : '2px solid transparent',
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                  <span className="text-[12px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Log Out */}
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group"
        style={{ color: '#EF4444' }}
      >
        <LogoutIcon />
        <span className="text-[12px] font-medium group-hover:text-red-400">Log Out</span>
      </button>
    </nav>
  );
}
