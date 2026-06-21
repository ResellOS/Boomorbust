'use client';



import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import type { DynastyGpsData } from '@/lib/dashboard/dynastyGps';



function StrengthGauge({ value, label }: { value: number; label: string }) {

  const pct = Math.min(100, Math.max(0, value));

  const circumference = 2 * Math.PI * 36;

  const offset = circumference - (pct / 100) * circumference;



  return (

    <div className="flex flex-col items-center">

      <div className="relative h-[88px] w-[88px]">

        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>

          <circle cx="44" cy="44" r="36" fill="none" stroke="#1e2640" strokeWidth="6" />

          <circle

            cx="44"

            cy="44"

            r="36"

            fill="none"

            stroke="#36E7A1"

            strokeWidth="6"

            strokeLinecap="round"

            strokeDasharray={circumference}

            strokeDashoffset={offset}

            style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.45))' }}

          />

        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">

          <span className="font-mono text-[18px] font-semibold tabular-nums leading-none text-boom">

            {pct.toFixed(0)}

          </span>

        </div>

      </div>

      <span className="mt-1 font-mono text-[7px] uppercase tracking-wide text-muted">{label}</span>

    </div>

  );

}



export default function DynastyGpsCard({ data }: { data: DynastyGpsData }) {

  return (

    <section className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">

      <div className="border-b border-[#1e2640]/80 px-3.5 py-2.5">

        <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">Dynasty GPS</h3>

        <p className="font-mono text-[8px] text-[#6b7a99]">Strategic context</p>

      </div>



      <div className="flex flex-1 flex-col gap-3 p-3.5">

        <div className="flex items-start justify-between gap-3">

          <div>

            <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">

              {data.isLeagueContext ? 'League Status' : 'Portfolio Status'}

            </div>

            <div

              className="mt-0.5 font-figtree text-[20px] font-semibold uppercase tracking-wide"

              style={{ color: data.portfolioStatusColor }}

            >

              {data.portfolioStatus}

            </div>

          </div>

          <StrengthGauge value={data.strengthNumeric} label={data.strengthLabel} />

        </div>



        <div className="grid grid-cols-2 gap-2">

          <Metric label="Window" value={data.window} />

          <Metric

            label={data.playoffOdds ? 'Playoff Odds' : data.strengthLabel}

            value={data.playoffOdds ?? data.strengthValue}

            accent={!data.playoffOdds}

          />

        </div>



        <div className="grid grid-cols-2 gap-2">

          <Metric label="Biggest Risk" value={data.biggestRisk} risk />

          <Metric label="Biggest Opportunity" value={data.biggestOpportunity} accent />

        </div>



        <div className="mt-auto border-t border-[#1e2640]/60 pt-3">

          <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">

            Recommended Focus

          </div>

          <p className="mt-1 font-figtree text-[11px] leading-relaxed text-[#e8ecf4]">

            {data.recommendedFocus}

          </p>

          <Link

            href="/dashboard/blueprint"

            className="mt-2 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline hover:underline"

          >

            View Full GPS

            <ChevronRight className="h-3 w-3" />

          </Link>

        </div>

      </div>

    </section>

  );

}



function Metric({

  label,

  value,

  accent,

  risk,

}: {

  label: string;

  value: string;

  accent?: boolean;

  risk?: boolean;

}) {

  return (

    <div className="rounded-md border border-[#1e2640]/60 bg-[#141929]/60 px-2.5 py-2">

      <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{label}</div>

      <div

        className={`mt-0.5 text-[12px] leading-snug ${accent ? 'font-mono tabular-nums text-boom' : 'font-figtree text-[#e8ecf4]'}`}

        style={risk ? { color: '#EF4444' } : undefined}

      >

        {value}

      </div>

    </div>

  );

}


