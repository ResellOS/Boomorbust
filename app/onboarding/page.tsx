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
  const [leagueCount, setLeagueCount] = useState(0);
  const [syncError, setSyncError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

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
        .select('sleeper_user_id')
        .single();
      if (data?.sleeper_user_id) {
        router.replace('/dashboard');
        return;
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

      const { error: saveErr } = await supabase
        .from('profiles')
        .update({
          sleeper_user_id: slUser.user_id,
          username: slUser.username ?? name,
        })
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

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-[var(--bg-secondary)] accent-[var(--indigo)] cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-[var(--text-muted)] leading-relaxed group-hover:text-[var(--text-secondary)] transition">
                      I agree that anonymized trade &amp; draft data may be used to improve dynasty value
                      calculations.{' '}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--indigo-light)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Full terms →
                      </a>
                    </span>
                  </label>

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

          {/* ── Step 3: Syncing ── */}
          {step === 'syncing' && (
            <div className="animate-fade-up text-center">
              <div className="card p-10 space-y-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[var(--indigo)]/15 border border-[var(--indigo)]/30 flex items-center justify-center">
                  <span className="text-2xl animate-spin inline-block" style={{ animationDuration: '1.2s' }}>
                    ⚙️
                  </span>
                </div>
                <div>
                  <h2 className="text-white text-2xl mb-2">Syncing your leagues</h2>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Importing leagues and rosters…
                  </p>
                </div>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-[var(--indigo)] animate-pulse-dot-custom"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="animate-fade-up text-center space-y-6">
              <div className="card p-8 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-3xl">
                  ✅
                </div>
                <div>
                  <h2 className="text-white mb-2">You&apos;re set up!</h2>
                  {leagueCount > 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm">
                      <span className="text-white font-semibold">
                        {leagueCount} league{leagueCount !== 1 ? 's' : ''}
                      </span>{' '}
                      synced and ready. Your roster intel, trade grades, and injury alerts are live.
                    </p>
                  ) : syncError ? (
                    <p className="text-amber-400 text-sm">{syncError}</p>
                  ) : (
                    <p className="text-[var(--text-secondary)] text-sm">
                      Your account is connected. Leagues will sync automatically.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: '📊', label: 'Trade Grades' },
                    { icon: '🏥', label: 'Injury Alerts' },
                    { icon: '🤖', label: 'Dynasty Analyst' },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center border border-white/5"
                    >
                      <span className="text-xl block mb-1">{icon}</span>
                      <span className="text-xs text-[var(--text-muted)]">{label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 text-white font-bold py-3 rounded-xl transition shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                >
                  Go to Dashboard →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  );
}
