import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wrapped_results')
    .select('data')
    .eq('token', params.token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data.data);
}
