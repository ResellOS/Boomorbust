import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { generateWeeklyDigest, buildDigestEmailHtml } from '@/lib/digest/generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: users } = await supabase.from('profiles').select('id');

  if (!users?.length) return NextResponse.json({ sent: 0 });

  const now = new Date();
  const week = Math.ceil((now.getTime() - new Date('2025-09-04').getTime()) / (7 * 86400000));
  const season = '2025';
  let sent = 0;

  for (const { id } of users) {
    const digest = await generateWeeklyDigest(id, week, season);
    if (!digest) continue;

    try {
      await resend.emails.send({
        from: 'The Front Office <hello@thefrontoffice.app>',
        to: digest.user_email,
        subject: `Week ${week} Dynasty Digest — ${digest.injuries.length} injury alert${digest.injuries.length !== 1 ? 's' : ''}`,
        html: buildDigestEmailHtml(digest),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send digest for ${id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}
