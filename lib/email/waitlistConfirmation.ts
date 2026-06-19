import { Resend } from 'resend';

const FROM = 'BOB <noreply@boomorbust.app>';

const BODY = `Welcome to Boom or Bust.

You're on the waitlist for early access.
We launch August 1, 2026.

As a founding member you'll get:
50% off your first 3 months
(first 100 signups)

We'll email you when the doors open.

— The BOB Team
boomorbust.app`;

export function waitlistDisplayName(email: string, name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    return first || trimmed;
  }
  const local = email.split('@')[0] ?? '';
  const part = local.split(/[._+-]/)[0] ?? local;
  if (!part) return 'there';
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export async function sendWaitlistConfirmationEmail(
  email: string,
  name?: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[waitlist] RESEND_API_KEY not set — skipping confirmation email');
    return;
  }

  const displayName = waitlistDisplayName(email, name);
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `You're on the list, ${displayName}`,
    text: BODY,
  });
}
