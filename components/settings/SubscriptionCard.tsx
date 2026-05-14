'use client';

import type { ProfileData } from '@/app/api/settings/profile/route';

interface Props {
  subscription: ProfileData['subscription'];
}

const TIER_COLOR: Record<string, string> = {
  elite: '#A78BFA',
  pro:   '#22D3EE',
  free:  '#64748B',
};

export default function SubscriptionCard({ subscription }: Props) {
  const color = TIER_COLOR[subscription.tier] ?? '#A78BFA';

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 100%)', border: '1px solid rgba(124,58,237,0.25)' }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 14l2-8 4 4.5 1.5-6 1.5 6 4-4.5 2 8H3z" fill={color} opacity="0.7" strokeLinejoin="round"/>
            <path d="M3 15.5h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-bold text-white">{subscription.label}</p>
          <div className="flex items-baseline gap-1">
            <p
              className="text-[28px] font-bold leading-none mt-1"
              style={{ fontFamily: 'JetBrains Mono, monospace', color }}
            >
              {subscription.price.split(' ')[0]}
            </p>
            <span className="text-[13px] text-slate-500">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{subscription.renewsLabel}</p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-5">
        {subscription.features.map((f) => (
          <li key={f} className="flex items-center gap-2.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5.5" fill={`${color}20`}/>
              <path d="M4 6.5l2 2 3-3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[12px] text-slate-300">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90"
        style={{ background: '#36E7A1', color: '#0a0d14' }}
      >
        Manage Subscription
      </button>
    </div>
  );
}
