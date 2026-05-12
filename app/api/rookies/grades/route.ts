import { NextResponse } from 'next/server';
import { build2025RookieProspectRecords } from '@/lib/rookies/rookie2025Board';

export async function GET() {
  return NextResponse.json({ prospects: build2025RookieProspectRecords() });
}
