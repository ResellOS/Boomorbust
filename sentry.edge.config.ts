import * as Sentry from '@sentry/nextjs'

// Edge-runtime init (middleware / edge routes). Same DSN-guarded behavior as the
// server config: no SENTRY_DSN → no init → captureException is a silent no-op.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}
