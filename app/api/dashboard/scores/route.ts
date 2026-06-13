import { NextResponse } from 'next/server';
import { fetchNflState } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';

interface EspnCompetitor {
  team?: { abbreviation?: string; displayName?: string };
  score?: string;
  winner?: boolean;
}

interface EspnEvent {
  id: string;
  status?: { type?: { completed?: boolean; shortDetail?: string; state?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
}

export async function GET() {
  try {
    const state = await fetchNflState();
    const inSeason =
      state != null &&
      state.season_type === 'regular' &&
      state.week >= 1 &&
      state.week <= 18;

    if (!inSeason) {
      return NextResponse.json({ inSeason: false, events: [] });
    }

    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      { next: { revalidate: 30 } },
    );
    if (!res.ok) {
      return NextResponse.json({ inSeason: false, events: [] });
    }

    const data = (await res.json()) as { events?: EspnEvent[]; season?: { type?: number } };
    const events = data.events ?? [];

    if (events.length === 0) {
      return NextResponse.json({ inSeason: false, events: [] });
    }

    const formatted = events.map((ev) => {
      const comp = ev.competitions?.[0];
      const teams = comp?.competitors ?? [];

      const status = ev.status?.type;
      const isFinal = status?.completed === true || status?.state === 'post';
      const isLive = status?.state === 'in';
      const detail = status?.shortDetail ?? '';

      const scoreHtml = teams
        .map((t) => {
          const abbr = t.team?.abbreviation ?? '???';
          const score = t.score ?? '0';
          const color = t.winner ? '#36E7A1' : '#6b7a99';
          return `<span style="color:${color}">${abbr} ${score}</span>`;
        })
        .join(' <span style="color:#6b7a99">•</span> ');

      const suffix = isFinal ? ' (FINAL)' : detail ? ` (${detail})` : '';
      return {
        id: ev.id,
        text: `${scoreHtml}${suffix}`,
        isLive,
        isFinal,
      };
    });

    return NextResponse.json({ inSeason: true, events: formatted });
  } catch {
    return NextResponse.json({ inSeason: false, events: [] });
  }
}
