/**
 * Tests de provisionTenant — atómico con rollback.
 *
 * Cubre:
 *  - Caso happy: tenant + auth user + profile creados; resultado contiene temp_password.
 *  - Slug duplicado: rollback no aplica (falla antes de crear auth user).
 *  - Email duplicado: rollback del tenant si auth user falla.
 *
 * Skip si faltan env vars (mismo patrón que rls.test.ts).
 */

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/lib/supabase/database.types';

import { generateTempPassword } from './passwords';
import { provisionTenant } from './provision';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_ENV = Boolean(URL && SERVICE);

const tag = `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const adminClient = () =>
  createClient<Database>(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const seededTenantIds: string[] = [];
const seededUserIds: string[] = [];

describe.skipIf(!HAS_ENV)('provisionTenant', () => {
  let preExistingEmail = '';

  beforeAll(async () => {
    // Pre-creamos un auth user para forzar colisión de email en uno de los tests
    preExistingEmail = `${tag}-existing@nebulab3d.test`;
    const admin = adminClient();
    const { data } = await admin.auth.admin.createUser({
      email: preExistingEmail,
      password: 'TestPassword1!',
      email_confirm: true,
    });
    if (data?.user) seededUserIds.push(data.user.id);
  });

  afterAll(async () => {
    const admin = adminClient();
    for (const id of seededUserIds) await admin.auth.admin.deleteUser(id);
    for (const id of seededTenantIds) await admin.from('tenants').delete().eq('id', id);
  });

  it('happy path: crea tenant + owner y devuelve temp_password', async () => {
    const result = await provisionTenant(
      adminClient(),
      {
        slug: `${tag}-happy`,
        name: 'Tenant Happy',
        plan: 'basic',
        owner_email: `${tag}-happy@nebulab3d.test`,
        owner_full_name: 'Owner Happy',
      },
      generateTempPassword(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    seededTenantIds.push(result.tenant_id);
    seededUserIds.push(result.owner_id);
    expect(result.temp_password).toHaveLength(16);

    // Verificar que la fila en users existe con must_change_password=true
    const admin = adminClient();
    const { data: profile } = await admin
      .from('users')
      .select('role, must_change_password, tenant_id')
      .eq('id', result.owner_id)
      .single();
    expect(profile?.role).toBe('owner');
    expect(profile?.must_change_password).toBe(true);
    expect(profile?.tenant_id).toBe(result.tenant_id);
  });

  it('email duplicado: rollback del tenant', async () => {
    const slug = `${tag}-dupemail`;
    const result = await provisionTenant(
      adminClient(),
      {
        slug,
        name: 'Tenant Dup',
        plan: 'basic',
        owner_email: preExistingEmail,
        owner_full_name: 'Owner Dup',
      },
      generateTempPassword(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('email');

    // Verificar que el tenant NO quedó huérfano
    const admin = adminClient();
    const { data: orphan } = await admin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    expect(orphan).toBeNull();
  });

  it('slug duplicado: error claro, sin auth user creado', async () => {
    const slug = `${tag}-dupslug`;
    const admin = adminClient();
    // Pre-crear un tenant con ese slug
    const { data: pre } = await admin
      .from('tenants')
      .insert({ slug, name: 'pre' })
      .select('id')
      .single();
    if (pre) seededTenantIds.push(pre.id);

    const email = `${tag}-dupslug@nebulab3d.test`;
    const result = await provisionTenant(
      adminClient(),
      {
        slug,
        name: 'Tenant Dup Slug',
        plan: 'basic',
        owner_email: email,
        owner_full_name: 'Owner X',
      },
      generateTempPassword(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/slug/i);

    // Verificar que NO se creó auth user (no hay rollback porque no llegó a crearse)
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    expect(list?.users.find((u) => u.email === email)).toBeUndefined();
  });
});
