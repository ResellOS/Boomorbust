import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateWeeklyDigest, buildDigestEmailHtml } from '@/lib/digest/generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: users } = await db.auth.admin.listUsers();

  if (!users?.users?.length) return NextResponse.json({ sent: 0 });

  const now = new Date();
  const week = Math.ceil((now.getTime() - new Date('2025-09-04').getTime()) / (7 * 86400000));
  const season = '2025';
  let sent = 0;

  for (const user of users.users) {
    if (!user.email) continue;
    const digest = await generateWeeklyDigest(user.id, user.email, week, season, db);
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
      console.error(`Failed to send digest for ${user.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}
