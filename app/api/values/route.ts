import { NextResponse } from 'next/server';
import { getKTCValues } from '@/lib/values/ktc';

export async function GET() {
  const values = await getKTCValues();
  const n = values?.length ?? 0;
  if (n === 0) {
    console.warn('[api/values] getKTCValues returned 0 rows — cache empty or scrape failed');
  } else {
    console.info(`[api/values] returning ${n} KTC rows`);
  }
  return NextResponse.json(values);
}
