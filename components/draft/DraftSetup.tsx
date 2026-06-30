'use client';

import { useCallback, useState } from 'react';
import type { DraftConfig, DraftTeam, RosterSlotConfig, RosterSlotType } from '@/lib/draft/types';
import {
  DEFAULT_ROSTER_SLOTS,
  PICK_TIMER_OPTIONS,
  SCORING_OPTIONS,
  TEAM_COUNT_OPTIONS,
  buildDefaultTeams,
  rosterSize,
  scoringIsSuperflex,
} from '@/lib/draft/defaults';
import { positionColor } from '@/lib/draft/engine';

type SetupTab = 'general' | 'roster' | 'order';

interface DraftSetupProps {
  config: DraftConfig;
  onChange: (next: Partial<DraftConfig>) => void;
  onStart: () => void;
  starting: boolean;
}

const SLOT_LABELS: Record<RosterSlotType, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  FLEX: 'FLEX W/R/T',
  K: 'K',
  DEF: 'DEF',
  BN: 'Bench',
};

function PillSelector<T extends string | number>({
  value,
  options,
  onSelect,
  scrollable,
}: {
  value: T;
  options: { value: T; label: string }[];
  onSelect: (v: T) => void;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${scrollable ? 'max-h-[88px] overflow-y-auto pr-1 [scrollbar-width:thin]' : ''}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[13px] font-semibold transition-colors ${
              active
                ? 'border-boom bg-boom/15 text-boom'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-[8px] border border-border bg-bg/40 px-3 py-2.5 text-left"
    >
      <span className="font-figtree text-[13px] text-text">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-boom' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4">
      <span className="pt-1 font-figtree text-[12px] font-bold uppercase tracking-[1px] text-muted">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

export default function DraftSetup({
  config,
  onChange,
  onStart,
  starting,
}: DraftSetupProps) {
  const [tab, setTab] = useState<SetupTab>('general');
  const size = rosterSize(config.rosterSlots);

  const syncTeams = useCallback(
    (teams: number, yourPick: number) => {
      const order = buildDefaultTeams(teams, yourPick);
      onChange({
        teams,
        yourPick,
        teamOrder: order,
        rounds: rosterSize(config.rosterSlots),
      });
    },
    [config.rosterSlots, onChange],
  );

  const updateSlot = (type: RosterSlotType, delta: number) => {
    const next = config.rosterSlots.map((s) =>
      s.type === type ? { ...s, count: Math.max(type === 'BN' ? 0 : 1, s.count + delta) } : s,
    );
    if (type === 'BN' && delta < 0) {
      const bn = next.find((s) => s.type === 'BN');
      if (bn && bn.count < 0) bn.count = 0;
    }
    onChange({ rosterSlots: next, rounds: rosterSize(next) });
  };

  const randomizeOrder = () => {
    const slots = [...config.teamOrder];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j]!, slots[i]!];
    }
    const reordered: DraftTeam[] = slots.map((t, i) => ({
      ...t,
      slot: i + 1,
      name: t.isUser ? 'You' : `Team ${i + 1}`,
    }));
    const userSlot = reordered.find((t) => t.isUser)?.slot ?? 1;
    onChange({ teamOrder: reordered, yourPick: userSlot });
  };

  const tabs: { id: SetupTab; label: string }[] = [
    { id: 'general', label: 'General Settings' },
    { id: 'roster', label: 'Roster Settings' },
    { id: 'order', label: 'Draft Order' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="font-mono text-[28px] uppercase tracking-[-0.5px] text-text md:text-[32px]">
          Startup Mock — Pre-Game Setup
        </h1>
        <p className="mt-1 font-mono text-[13px] text-muted">
          Configure your war room before the draft clock starts.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 font-figtree text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? 'border-boom text-boom'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-[12px] border border-border bg-surface/60 p-5 backdrop-blur-xl">
        {tab === 'general' && (
          <div className="flex flex-col gap-5">
            <FieldRow label="Draft Name">
              <input
                value={config.draftName}
                onChange={(e) => onChange({ draftName: e.target.value })}
                className="w-full rounded-[8px] border border-border bg-bg px-3 py-2 font-figtree text-[14px] text-text outline-none focus:border-boom/50"
              />
            </FieldRow>

            <FieldRow label="Draft Type">
              <PillSelector
                value={config.draftOrderType}
                options={[
                  { value: 'snake' as const, label: 'Snake' },
                  { value: 'linear' as const, label: 'Linear' },
                ]}
                onSelect={(v) => onChange({ draftOrderType: v })}
              />
              <p className="mt-1 font-mono text-[10px] text-muted">Auction — coming soon</p>
            </FieldRow>

            <FieldRow label="Scoring">
              <PillSelector
                value={config.scoring}
                options={SCORING_OPTIONS}
                onSelect={(v) =>
                  onChange({ scoring: v, superflex: scoringIsSuperflex(v) })
                }
              />
            </FieldRow>

            <FieldRow label="Teams">
              <PillSelector
                value={config.teams}
                scrollable
                options={TEAM_COUNT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
                onSelect={(v) => syncTeams(v, Math.min(config.yourPick, v))}
              />
            </FieldRow>

            <FieldRow label="Time / Pick">
              <PillSelector
                value={config.pickTimer}
                options={PICK_TIMER_OPTIONS}
                onSelect={(v) => onChange({ pickTimer: v })}
              />
            </FieldRow>

            <ToggleSwitch
              label="CPU Autopick when timer expires"
              checked={config.cpuAutopick}
              onChange={(v) => onChange({ cpuAutopick: v })}
            />

            <FieldRow label="Available Players">
              <PillSelector
                value={config.playerPool}
                options={[
                  { value: 'all' as const, label: 'All' },
                  { value: 'rookies' as const, label: 'Rookies Only' },
                  { value: 'vets' as const, label: 'Vets Only' },
                ]}
                onSelect={(v) => onChange({ playerPool: v })}
              />
            </FieldRow>

            <ToggleSwitch
              label="Third Round Reversal"
              checked={config.thirdRoundReversal}
              onChange={(v) => onChange({ thirdRoundReversal: v })}
            />

            <ToggleSwitch
              label="Show Team Names on board"
              checked={config.showTeamNames}
              onChange={(v) => onChange({ showTeamNames: v })}
            />
          </div>
        )}

        {tab === 'roster' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-figtree text-[14px] font-bold text-text">Roster Builder</span>
              <span className="font-mono text-[13px] text-boom">
                {size} slots · {config.rounds} rounds
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {config.rosterSlots.map((slot) => (
                <RosterSlotRow key={slot.type} slot={slot} onDelta={(d) => updateSlot(slot.type, d)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  rosterSlots: DEFAULT_ROSTER_SLOTS.map((s) => ({ ...s })),
                  rounds: rosterSize(DEFAULT_ROSTER_SLOTS),
                })
              }
              className="mt-4 font-figtree text-[12px] text-muted underline hover:text-text"
            >
              Reset to default
            </button>
          </div>
        )}

        {tab === 'order' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-figtree text-[14px] font-bold text-text">Draft Slots</span>
              <button
                type="button"
                onClick={randomizeOrder}
                className="rounded-[6px] border border-border px-3 py-1.5 font-figtree text-[12px] font-semibold text-text hover:border-boom/40"
              >
                Randomize Teams
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {config.teamOrder.map((team) => (
                <div
                  key={team.slot}
                  className={`flex items-center gap-3 rounded-[8px] border px-3 py-2 ${
                    team.isUser ? 'border-boom/40 bg-boom/[0.06]' : 'border-border bg-bg/30'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface2 font-mono text-[12px] font-bold text-text">
                    {team.slot}
                  </span>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
                    style={{
                      background: team.isUser
                        ? 'linear-gradient(135deg,#36E7A1,#22D3EE)'
                        : '#334155',
                    }}
                  >
                    {team.isUser ? 'YOU' : team.slot}
                  </div>
                  <input
                    value={team.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      onChange({
                        teamOrder: config.teamOrder.map((t) =>
                          t.slot === team.slot ? { ...t, name } : t,
                        ),
                      });
                    }}
                    className="min-w-0 flex-1 border-none bg-transparent font-figtree text-[14px] text-text outline-none"
                  />
                  {!team.isUser && (
                    <button
                      type="button"
                      onClick={() => {
                        const order = config.teamOrder.map((t) => ({
                          ...t,
                          isUser: t.slot === team.slot,
                          name: t.slot === team.slot ? 'You' : t.name.replace(/^You$/, `Team ${t.slot}`),
                        }));
                        onChange({ teamOrder: order, yourPick: team.slot });
                      }}
                      className="shrink-0 font-mono text-[10px] text-muted hover:text-boom"
                    >
                      Set as me
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-3">
        <p className="font-mono text-[11px] text-muted">Startup Mock: $10 per draft</p>
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="w-full rounded-[10px] bg-boom py-4 font-figtree text-[16px] font-extrabold uppercase tracking-[2px] text-bg transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-16"
        >
          {starting ? 'Starting…' : 'Start Draft'}
        </button>
      </div>
    </div>
  );
}

function RosterSlotRow({
  slot,
  onDelta,
}: {
  slot: RosterSlotConfig;
  onDelta: (delta: number) => void;
}) {
  const color = positionColor(slot.type === 'FLEX' ? 'FLEX' : slot.type);
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-border bg-bg/30 px-3 py-2">
      <span
        className="w-[100px] shrink-0 font-figtree text-[13px] font-bold"
        style={{ color }}
      >
        {SLOT_LABELS[slot.type]}
      </span>
      <button
        type="button"
        onClick={() => onDelta(-1)}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border font-mono text-[15px] text-muted hover:text-text"
      >
        −
      </button>
      <span className="w-8 text-center font-mono text-[15px] font-bold text-text">{slot.count}</span>
      <button
        type="button"
        onClick={() => onDelta(1)}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-border font-mono text-[15px] text-muted hover:text-text"
      >
        +
      </button>
    </div>
  );
}
