import { redirect } from 'next/navigation';

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return undefined;
}

/** Marketing URL → waitlist / auth signup with query preserved. */
export default function SignupRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  const plan = firstParam(searchParams.plan);
  if (plan) qs.set('plan', plan);
  const next = firstParam(searchParams.next);
  if (next) qs.set('next', next);
  const q = qs.toString();
  redirect(q ? `/auth/signup?${q}` : '/auth/signup');
}
