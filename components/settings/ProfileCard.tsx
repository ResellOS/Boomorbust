'use client';

import { useState } from 'react';
import type { ProfileData } from '@/app/api/settings/profile/route';

interface Props {
  data: ProfileData;
  onEdit: () => void;
}

function CrownSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M4 22l3-12 6 7 3-9 3 9 6-7 3 12H4z" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M4 24h24" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="4"  cy="10" r="2" fill="#A78BFA"/>
      <circle cx="16" cy="7"  r="2" fill="#A78BFA"/>
      <circle cx="28" cy="10" r="2" fill="#A78BFA"/>
    </svg>
  );
}

export default function ProfileCard({ data, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [teamName, setTeamName] = useState(data.teamName);
  const [bio, setBio] = useState(data.bio);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName, bio }),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'LEAGUES', value: String(data.leagueCount), color: '#A78BFA' },
    { label: 'CHAMPIONSHIPS', value: String(data.championships), color: '#A78BFA' },
    {
      label: 'AVG ROSTER TFO',
      value: data.dynastyPowerRating != null ? data.dynastyPowerRating.toFixed(1) : '—',
      color: '#36E7A1',
      sub: data.dynastyPowerRating != null ? 'Dynasty power' : 'Sync leagues first',
    },
    { label: 'PLAYERS ROSTERED', value: String(data.playersRostered), color: '#22D3EE' },
  ];

  return (
    <div
      className="rounded-xl p-6 mb-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(124,58,237,0.15)', border: '2px solid rgba(167,139,250,0.4)', boxShadow: '0 0 24px rgba(124,58,237,0.3)' }}
          >
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <CrownSVG />
            )}
          </div>

          <div>
            {editing ? (
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="text-[22px] font-bold text-white bg-transparent border-b border-white/20 outline-none mb-1"
              />
            ) : (
              <h2 className="text-[22px] font-bold text-white mb-1">{teamName}</h2>
            )}

            <p className="text-[13px] font-mono text-slate-400 mb-1">@{data.username}</p>

            <span
              className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider mb-1.5"
              style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}
            >
              {data.dynastyTitle}
            </span>

            <p className="text-[13px] text-slate-500">{data.memberSince}</p>

            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Tell your league who you are…"
                className="mt-1.5 w-full max-w-xs text-[14px] text-slate-300 bg-white/[0.05] rounded-lg px-3 py-2 border border-white/10 outline-none resize-none"
              />
            ) : (
              bio ? (
                <p className="text-[14px] text-slate-400 mt-1.5">{bio}</p>
              ) : null
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] text-slate-400 border border-white/10 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
                style={{ background: '#36E7A1', color: '#0a0d14' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditing(true); onEdit(); }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-300 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p
              className="text-[26px] font-bold leading-tight"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: s.color }}
            >
              {s.value}
            </p>
            {'sub' in s && s.sub && (
              <p className="text-[11px] font-semibold" style={{ color: s.color }}>{s.sub}</p>
            )}
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
