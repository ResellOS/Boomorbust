'use client';

import type { CoachSettings, CoachPersonality, CoachDetail } from './types';

interface Props {
  settings: CoachSettings;
  onChange: (s: CoachSettings) => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200"
      style={{ background: on ? '#36E7A1' : 'rgba(255,255,255,0.12)' }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
        style={{ left: on ? '22px' : '2px' }}
      />
    </button>
  );
}

function Select<T extends string>({
  value, options, onChange,
}: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full text-[12px] font-medium bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-1.5 text-white appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#0a0d14]">{o}</option>
      ))}
    </select>
  );
}

const TOGGLES: Array<{ key: keyof CoachSettings; label: string }> = [
  { key: 'allLeagueContext', label: 'All League Context' },
  { key: 'tradeHistory',     label: 'Trade History' },
  { key: 'playerNews',       label: 'Player News' },
  { key: 'injuryUpdates',    label: 'Injury Updates' },
];

export default function CoachSettings({ settings, onChange }: Props) {
  const update = <K extends keyof CoachSettings>(k: K, v: CoachSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">COACH SETTINGS</p>

      {/* AI Personality */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-slate-400 font-medium">AI Personality</label>
        <Select<CoachPersonality>
          value={settings.personality}
          options={['Competitive', 'Balanced', 'Conservative']}
          onChange={(v) => update('personality', v)}
        />
      </div>

      {/* Response Detail */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-slate-400 font-medium">Response Detail</label>
        <Select<CoachDetail>
          value={settings.detail}
          options={['Detailed', 'Brief', 'Data-Only']}
          onChange={(v) => update('detail', v)}
        />
      </div>

      {/* Include toggles */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-slate-400 font-medium">Include</label>
        <div className="space-y-2.5 pt-1">
          {TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[12px] text-slate-300">{label}</span>
              <Toggle
                on={settings[key] as boolean}
                onToggle={() => update(key, !settings[key] as CoachSettings[typeof key])}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
