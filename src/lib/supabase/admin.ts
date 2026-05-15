import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { getServerEnv } from './env';

/**
 * Cliente con SERVICE_ROLE — bypassea RLS por completo.
 *
 * SOLO usar en server-side cuando ya hayás verificado autorización (ej:
 * super-admin acciones, webhooks firmados, jobs internos). NUNCA exponer
 * al cliente. NUNCA importar desde código que pueda terminar en bundle de browser.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
