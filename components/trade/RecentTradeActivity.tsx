'use client';



import type { TradeHistoryRow } from '@/lib/trade/types';



export default function RecentTradeActivity({ history }: { history: TradeHistoryRow[] }) {

  if (history.length === 0) return null;



  return (

    <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-2.5">

      <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">

        Recent Trade Activity

      </h3>

      <p className="font-mono text-[8px] text-[#6b7a99]">League market pulse</p>

      <ul className="mt-2 space-y-1.5">

        {history.slice(0, 4).map((row) => (

          <li

            key={row.id}

            className="border-b border-[#1e2640]/40 pb-1.5 font-figtree text-[10px] last:border-b-0 last:pb-0"

          >

            <div className="text-[#e8ecf4]">

              <span className="font-semibold">{row.gaveName}</span>

              <span className="mx-1 text-[#6b7a99]">↔</span>

              {row.receivedDisplay}

            </div>

            <div className="font-mono text-[8px] text-[#6b7a99]">{row.timeAgo}</div>

          </li>

        ))}

      </ul>

    </section>

  );

}

