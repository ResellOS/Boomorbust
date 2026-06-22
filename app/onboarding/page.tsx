'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import LeagueNameSearch from '@/components/LeagueNameSearch';
import { appendLeagueIdToDraft, parseLeagueIds } from '@/lib/leagueIds';

type Step = 'connect' | 'leagues' | 'syncing' | 'done';

function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ['connect', 'leagues', 'syncing', 'done'];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 justify-center mb-10">
      {steps.map((s, i) => (
        <div
          key={s}
          className={clsx(
            'h-1.5 rounded-full transition-all duration-300',
            i === idx ? 'w-8 bg-[var(--indigo)]' : i < idx ? 'w-4 bg-[var(--indigo)]/50' : 'w-4 bg-white/10',
          )}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('connect');
  const [username, setUsername] = useState('');
  const [leagueInput, setLeagueInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  // True when the profile already has tos_accepted_at — we then skip the checkbox.
  const [tosAlreadyAccepted, setTosAlreadyAccepted] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/signup?next=/onboarding');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('sleeper_user_id, tos_accepted_at')
        .single();
      if (data?.sleeper_user_id) {
        router.replace('/dashboard');
        return;
      }
      // Already accepted (e.g. returning to onboarding) → don't re-prompt.
      if (data?.tos_accepted_at) {
        setTosAlreadyAccepted(true);
        setTermsAccepted(true);
      }
      setAuthChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim().replace(/^@/, '');
    if (!name) return;
    setLoading(true);
    setError('');
    const supabase = createClient();

    try {
      const slRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(name)}`);
      if (!slRes.ok) {
        setError('Sleeper username not found. Double-check your username and try again.');
        return;
      }
      const slUser = (await slRes.json()) as { user_id?: string; username?: string };
      if (!slUser.user_id) {
        setError('Invalid Sleeper response.');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please sign in again.');
        return;
      }

      const profileUpdate: {
        sleeper_user_id: string;
        username: string;
        tos_accepted_at?: string;
      } = {
        sleeper_user_id: slUser.user_id,
        username: slUser.username ?? name,
      };
      // Stamp active TOS/Privacy acceptance the first time only; preserve the
      // original timestamp if the profile was already accepted.
      if (!tosAlreadyAccepted) {
        profileUpdate.tos_accepted_at = new Date().toISOString();
      }

      const { error: saveErr } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (saveErr) {
        setError('Could not save profile. Try again.');
        return;
      }

      setStep('leagues');
    } catch (err) {
      setError(`Something went wrong: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncLoading(true);
    setSyncError('');

    const ids = leagueInput
      .split(/[\s,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Validate each league ID against Sleeper before advancing
    for (const id of ids) {
      try {
        const res = await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(id)}`);
        const league = res.ok ? (await res.json()) as { league_id?: string } | null : null;
        if (!league || !league.league_id) {
          setSyncError(`Invalid league ID: "${id}". Check your IDs and try again.`);
          setSyncLoading(false);
          return;
        }
      } catch {
        setSyncError(`Could not validate league ID "${id}". Check your connection and try again.`);
        setSyncLoading(false);
        return;
      }
    }

    // Hand off to the full-screen War Room sync page, which runs the sync
    // and polls progress before landing on the dashboard.
    try {
      sessionStorage.setItem('bob:onboarding_league_ids', JSON.stringify(ids));
    } catch {
      /* sync page falls back to all-leagues sync */
    }
    setSyncLoading(false);
    router.push('/onboarding/syncing');
  }

  if (!authChecked) {
    return (
      <AppBackground intensity="subtle">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--indigo)] animate-pulse" />
            Checking your session...
          </div>
        </div>
      </AppBackground>
    );
  }

  return (
    <AppBackground intensity="subtle">
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-full2.png"
              height={28}
              alt="Boom or Bust"
              className="h-7 w-auto object-contain sm:h-8"
              style={{ width: 'auto' }}
            />
          </div>

          <StepDots current={step} />

          {/* ── Step 1: Enter username ── */}
          {step === 'connect' && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h1 className="text-white mb-2">Connect your leagues</h1>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Enter your Sleeper username to get started.
                </p>
              </div>

              <div className="card p-7">
                <form onSubmit={handleConnect} className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                      Sleeper Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. DynastyKing99"
                      autoFocus
                      required
                      className="w-full bg-[var(--bg-secondary)] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--indigo)] focus:ring-1 focus:ring-[var(--indigo)] transition text-sm"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                      {error}
                    </p>
                  )}

                  {!tosAlreadyAccepted && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-[var(--bg-secondary)] cursor-pointer flex-shrink-0"
                        style={{ accentColor: '#36E7A1' }}
                      />
                      <span
                        className="text-xs leading-relaxed"
                        style={{ color: '#6b7a99', fontFamily: 'var(--font-figtree), Figtree, sans-serif' }}
                      >
                        I agree to the{' '}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: '#36E7A1' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: '#36E7A1' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !username.trim() || !termsAccepted}
                    className="w-full bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                  >
                    {loading ? 'Looking up…' : 'Continue →'}
                  </button>
                </form>

                <p className="text-center text-xs text-[var(--text-muted)] mt-5">
                  Read-only access. We never post or modify anything on Sleeper.
                </p>
              </div>

              <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                Don&apos;t have a Sleeper account?{' '}
                <a
                  href="https://sleeper.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--indigo-light)] hover:underline"
                >
                  Create one free →
                </a>
              </p>
            </div>
          )}

          {/* ── Step 2: Enter league IDs ── */}
          {step === 'leagues' && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h1 className="text-white mb-2">Add your leagues</h1>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  Search by name or paste Sleeper league IDs. Leave the ID box empty to sync every league on your account.
                </p>
              </div>

              <div className="card p-7 space-y-5">
                <LeagueNameSearch
                  existingLeagueIds={parseLeagueIds(leagueInput)}
                  onAppendLeagueId={(id) => setLeagueInput((prev) => appendLeagueIdToDraft(prev, id))}
                />

                <div>
                  <label className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-2">
                    Enter league ID <span className="normal-case text-[var(--text-muted)]">(one per line or comma-separated)</span>
                  </label>
                  <textarea
                    value={leagueInput}
                    onChange={(e) => setLeagueInput(e.target.value)}
                    placeholder={"1048374694683095040\n998765432109876543"}
                    rows={4}
                    className="w-full bg-[var(--bg-secondary)] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--indigo)] focus:ring-1 focus:ring-[var(--indigo)] transition text-sm font-mono resize-none"
                  />
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">Where to find your league ID</p>
                  <ol className="space-y-1 text-[11px] text-[var(--text-muted)]">
                    <li>1. Open Sleeper → tap your league</li>
                    <li>2. Tap the <span className="text-white">⚙️ Settings</span> icon</li>
                    <li>3. Scroll to <span className="text-white">League ID</span> and copy it</li>
                  </ol>
                </div>

                {syncError && (
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                    {syncError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="w-full bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                >
                  {syncLoading ? 'Starting…' : 'Sync Leagues →'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('connect'); setError(''); }}
                  className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2 transition"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Steps 3–4 (syncing/done) now live at /onboarding/syncing */}
        </div>
      </div>
    </AppBackground>
  );
}
