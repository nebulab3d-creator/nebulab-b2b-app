import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import type { CreateTenantWithOwnerInput } from '@/lib/validations/super-admin';

export type ProvisionResult =
  | {
      ok: true;
      tenant_id: string;
      owner_id: string;
      owner_email: string;
      temp_password: string;
    }
  | { ok: false; error: string };

/**
 * Crea atómicamente:
 *   1. Una fila en `tenants`
 *   2. Un auth.user con password temporal y email_confirm=true
 *   3. Una fila en `users` con role='owner' y must_change_password=true
 *
 * Si cualquier paso falla, hace rollback de los anteriores. No deja huérfanos.
 *
 * Requiere `admin` con SERVICE_ROLE (bypassea RLS).
 */
export async function provisionTenant(
  admin: SupabaseClient<Database>,
  input: CreateTenantWithOwnerInput,
  tempPassword: string,
): Promise<ProvisionResult> {
  // 1. Tenant
  const { data: tenant, error: tErr } = await admin
    .from('tenants')
    .insert({ slug: input.slug, name: input.name, plan: input.plan })
    .select('id')
    .single();
  if (tErr || !tenant) {
    const msg =
      tErr?.code === '23505' ? 'Ese slug ya existe' : (tErr?.message ?? 'Error creando tenant');
    return { ok: false, error: msg };
  }

  // 2. Auth user (rollback tenant si falla)
  const { data: au, error: auErr } = await admin.auth.admin.createUser({
    email: input.owner_email,
    password: tempPassword,
    email_confirm: true,
  });
  if (auErr || !au?.user) {
    await admin.from('tenants').delete().eq('id', tenant.id);
    const isExists =
      auErr?.message?.toLowerCase().includes('already') ||
      (auErr as { code?: string } | null)?.code === 'email_exists';
    return {
      ok: false,
      error: isExists
        ? 'Ese email ya está registrado'
        : (auErr?.message ?? 'Error creando usuario'),
    };
  }

  // 3. Profile (rollback ambos si falla)
  const { error: pErr } = await admin.from('users').insert({
    id: au.user.id,
    tenant_id: tenant.id,
    role: 'owner',
    full_name: input.owner_full_name,
    email: input.owner_email,
    must_change_password: true,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(au.user.id);
    await admin.from('tenants').delete().eq('id', tenant.id);
    return { ok: false, error: pErr.message ?? 'Error creando perfil' };
  }

  return {
    ok: true,
    tenant_id: tenant.id,
    owner_id: au.user.id,
    owner_email: input.owner_email,
    temp_password: tempPassword,
  };
}
