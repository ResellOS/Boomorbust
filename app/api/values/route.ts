import { NextResponse } from 'next/server';
import { getKTCValues } from '@/lib/values/ktc';

export async function GET() {
  const values = await getKTCValues();
  return NextResponse.json(values);
}
