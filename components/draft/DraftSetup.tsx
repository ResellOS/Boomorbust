'use client';

import type {
  DraftConfig,
  DraftType,
  ScoringFormat,
} from '@/lib/draft/types';
import { roundsForType } from '@/lib/draft/engine';

interface DraftSetupProps {
  config: DraftConfig;
  onChange: (next: Partial<DraftConfig>) => void;
  onStart: () => void;
  starting: boolean;
}

function ToggleRow<T extends string | number | boolean>({
  label,
  value,
  options,
  onSelect,
  format,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onSelect: (v: T) => void;
  format?: 'mono' | 'ui';
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
      <span className="font-figtree text-[12px] font-semibold uppercase tracking-[1px] text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`rounded-[6px] border px-3 py-1.5 text-[12px] transition-colors ${
                format === 'mono' ? 'font-mono' : 'font-figtree font-semibold'
              } ${
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
    </div>
  );
}

export default function DraftSetup({
  config,
  onChange,
  onStart,
  starting,
}: DraftSetupProps) {
  const roundOptions = roundsForType(config.draftType);
  const slotOptions = Array.from({ length: config.teams }, (_, i) => i + 1);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-6 py-10">
      <div>
        <h1 className="font-figtree text-[34px] font-extrabold tracking-[-0.5px] text-text">
          DRAFT ROOM
        </h1>
        <p className="mt-1 font-figtree text-[14px] text-muted">
          Mock smarter. Draft better.
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-[12px] border border-border bg-surface/60 p-6 backdrop-blur-xl">
        <ToggleRow<DraftType>
          label="Draft Type"
          value={config.draftType}
          onSelect={(v) => {
            const rounds = roundsForType(v);
            onChange({
              draftType: v,
              rounds: rounds.includes(config.rounds) ? config.rounds : rounds[0],
            });
          }}
          options={[
            { value: 'startup', label: 'Startup' },
            { value: 'rookie', label: 'Rookie' },
            { value: 'redraft', label: 'Redraft' },
          ]}
        />

        <ToggleRow<number>
          label="Teams"
          value={config.teams}
          format="mono"
          onSelect={(v) =>
            onChange({
              teams: v,
              yourPick: Math.min(config.yourPick, v),
            })
          }
          options={[8, 10, 12, 14].map((n) => ({ value: n, label: String(n) }))}
        />

        <ToggleRow<number>
          label="Rounds"
          value={config.rounds}
          format="mono"
          onSelect={(v) => onChange({ rounds: v })}
          options={roundOptions.map((n) => ({ value: n, label: String(n) }))}
        />

        <ToggleRow<ScoringFormat>
          label="Scoring"
          value={config.scoring}
          onSelect={(v) => onChange({ scoring: v })}
          options={[
            { value: 'ppr', label: 'PPR' },
            { value: 'half_ppr', label: 'Half PPR' },
            { value: 'standard', label: 'Standard' },
          ]}
        />

        <ToggleRow<boolean>
          label="Superflex"
          value={config.superflex}
          onSelect={(v) => onChange({ superflex: v })}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
        />

        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <span className="font-figtree text-[12px] font-semibold uppercase tracking-[1px] text-muted">
            Your Pick
          </span>
          <div className="flex flex-wrap gap-1.5">
            {slotOptions.map((n) => {
              const active = n === config.yourPick;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ yourPick: n })}
                  className={`h-8 w-8 rounded-[6px] border font-mono text-[12px] transition-colors ${
                    active
                      ? 'border-boom bg-boom/15 text-boom'
                      : 'border-border bg-surface text-muted hover:text-text'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="self-start rounded-[8px] bg-boom px-8 py-3 font-figtree text-[14px] font-extrabold uppercase tracking-[1px] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {starting ? 'Starting…' : 'Start Draft'}
      </button>
    </div>
  );
}
