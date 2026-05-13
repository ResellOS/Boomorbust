import { redirect } from 'next/navigation';

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return undefined;
}

/** Marketing URL → app login with query preserved. */
export default function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();
  for (const key of Object.keys(searchParams)) {
    const val = firstParam(searchParams[key]);
    if (val != null) qs.set(key, val);
  }
  const q = qs.toString();
  redirect(q ? `/auth/login?${q}` : '/auth/login');
}
