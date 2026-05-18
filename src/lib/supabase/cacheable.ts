import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { getPublicEnv } from './env';

/**
 * Cliente anon SIN cookies — usable dentro de `unstable_cache(...)`.
 *
 * El cliente normal de `server.ts` usa `cookies()` (de `next/headers`), que es
 * una fuente dinámica y Next 14 prohíbe llamar dentro de funciones cacheadas:
 *   "used 'cookies' inside a function cached with unstable_cache(...).
 *    Accessing Dynamic data sources inside a cache scope is not supported."
 *
 * Para reads públicos del comensal (menú, tenant por slug) este alcanza:
 * RLS de anon filtra solo lo público igual.
 */
export function createCacheableAnonClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
