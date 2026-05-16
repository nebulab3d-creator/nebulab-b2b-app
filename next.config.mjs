import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental.instrumentationHook se vuelve default en Next 15; en 14.2 lo dejamos explícito
  // para que `src/instrumentation.ts` se cargue al boot.
  experimental: { instrumentationHook: true },
  images: {
    remotePatterns: [
      // Cualquier proyecto Supabase (storage v1 public objects)
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Silenciar logs en CI sin auth token (no rompe el build)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Subir source maps SOLO si tenemos auth token (prod build con secret)
  disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  // Tunnel para evitar ad-blockers que bloquean sentry.io
  tunnelRoute: '/monitoring',
  webpack: {
    removeDebugLogging: true,
    automaticVercelMonitors: true,
  },
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
