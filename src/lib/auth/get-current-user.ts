import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

import type { CurrentUser, UserRole } from './types';

/**
 * Devuelve el usuario autenticado actual o null.
 *
 * Cacheado por React para que llamarla desde múltiples Server Components
 * en un mismo request no haga round-trips repetidos a Supabase.
 *
 * Lógica:
 *  1. Obtiene auth.user (cookies de sesión).
 *  2. Si está en `super_admins` → kind='super'.
 *  3. Si no, busca su perfil en `users` + tenant → kind='tenant'.
 *  4. RLS en super_admins solo deja ver al propio super, así que la query
 *     del paso 2 es segura aunque la corra un tenant user (devuelve 0 filas).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const auth = { id: user.id, email: user.email ?? '' };

  const { data: superRow } = await supabase
    .from('super_admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (superRow) return { kind: 'super', auth };

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .maybeSingle();
  if (!tenant) return null;

  return {
    kind: 'tenant',
    auth,
    profile,
    tenant,
    role: profile.role as UserRole,
  };
});
