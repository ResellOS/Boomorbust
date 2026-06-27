import * as Sentry from '@sentry/nextjs'

// Loads the runtime-appropriate Sentry server init. Runs once at server startup
// (requires experimental.instrumentationHook in next.config.mjs on Next 14).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures unhandled errors thrown in API route handlers / server components.
// (No-op until Sentry is initialized, i.e. when SENTRY_DSN is set.)
export const onRequestError = Sentry.captureRequestError
