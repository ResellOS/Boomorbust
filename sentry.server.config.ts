import * as Sentry from '@sentry/nextjs'

// Server-side Sentry init. DSN comes ONLY from the environment — if SENTRY_DSN is
// not set, Sentry is never initialized and every Sentry.captureException(...) call
// becomes a silent no-op, so the app runs normally with no error monitoring and
// nothing thrown. No DSN is ever hardcoded.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Backend only — no frontend/session/replay instrumentation.
  })
}
