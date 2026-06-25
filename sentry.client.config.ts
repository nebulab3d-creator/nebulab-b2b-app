import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn && process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Replay deshabilitado en MVP (costo + privacidad)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // Comensal anon: no enviamos NADA a Sentry desde /r/* ni /q/* (Habeas Data)
  beforeSend(event) {
    const url = event.request?.url ?? '';
    if (url.includes('/r/') || url.includes('/q/')) return null;
    return event;
  },
});
