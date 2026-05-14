import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized — log in first.' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const syncRes = await fetch(`${origin}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': req.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({}),
  });

  const data = await syncRes.json() as unknown;
  return NextResponse.json(data, { status: syncRes.status });
}
