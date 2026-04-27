import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWeeklyDigest, buildDigestEmailHtml } from '@/lib/digest/generator';
import { Resend } from 'resend';

function requireAdmin(email: string | undefined) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!requireAdmin(user?.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminUser = user!;

  try {
    const digest = await generateWeeklyDigest(adminUser.id, 1, '2025');
    if (!digest) return NextResponse.json({ message: '✗ No digest data — sync leagues first' }, { status: 400 });

    const html = buildDigestEmailHtml(digest);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'The Front Office <hello@thefrontoffice.app>',
      to: adminUser.email!,
      subject: '[TEST] Week 1 Dynasty Digest — The Front Office',
      html,
    });

    return NextResponse.json({ message: `✓ Test digest sent to ${adminUser.email}` });
  } catch (e) {
    return NextResponse.json({ message: `✗ Error: ${String(e)}` }, { status: 500 });
  }
}
