import 'server-only';

import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

/**
 * Cliente PostHog server-side. Singleton lazy.
 * Devuelve null si no hay POSTHOG_KEY (no-op en dev / preview sin tracking).
 *
 * Uso:
 *   const ph = getPosthogServer();
 *   ph?.capture({ distinctId: userId, event: 'tenant_created', properties: { ... } });
 *   await ph?.shutdown();  // si vas a salir del proceso
 */
export function getPosthogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1, // serverless: flush inmediato
      flushInterval: 0,
    });
  }
  return client;
}
