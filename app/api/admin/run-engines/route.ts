import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function requireAdmin(email: string | undefined): boolean {
  return !!email && email === process.env.ADMIN_EMAIL;
}

interface EngineResult {
  tfo: { success: boolean; calculated: number };
  ktc: { success: boolean };
  bvi: { success: boolean };
  duration: number;
}

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !requireAdmin(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const start = Date.now();
  const origin = new URL(req.url).origin;
  const cookie = req.headers.get('cookie') ?? '';
  const cronAuth = `Bearer ${process.env.CRON_SECRET ?? ''}`;

  // ── Step 1: TFO pre-warm for this user's roster ──────────────────────────
  const tfo: EngineResult['tfo'] = await (async () => {
    try {
      const res = await fetch(`${origin}/api/onboarding/calculate-tfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({}),
      });
      const body = (await res.json()) as { calculated?: number };
      return { success: res.ok, calculated: body.calculated ?? 0 };
    } catch {
      return { success: false, calculated: 0 };
    }
  })();

  // ── Step 2: KTC cache refresh ─────────────────────────────────────────────
  const ktc: EngineResult['ktc'] = await (async () => {
    try {
      const res = await fetch(`${origin}/api/cron/sync-ktc`, {
        headers: { Authorization: cronAuth },
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  })();

  // ── Step 3: BBV engine (BVI scores for all active players) ───────────────
  const bvi: EngineResult['bvi'] = await (async () => {
    try {
      const res = await fetch(`${origin}/api/cron/calculate-bbv`, {
        headers: { Authorization: cronAuth },
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  })();

  const result: EngineResult = {
    tfo,
    ktc,
    bvi,
    duration: Date.now() - start,
  };

  return NextResponse.json(result);
}
