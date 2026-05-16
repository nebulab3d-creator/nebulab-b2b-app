/**
 * Tests de aislamiento RLS contra el proyecto Supabase real.
 *
 * - Seedea 2 tenants + 2 owners (auth.users + public.users) con tag random.
 * - Verifica que cada owner solo ve su propio tenant y users.
 * - Verifica helpers `current_tenant_id` y `is_super_admin`.
 * - Verifica que anon (no auth) no lee nada.
 * - afterAll borra todo lo seedeado.
 *
 * Skip automático si faltan env vars (CI sin secrets, dev sin .env.local).
 */

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from './database.types';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_ENV = Boolean(URL && ANON && SERVICE);

const tag = `rls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface SeededUser {
  id: string;
  email: string;
  password: string;
}

let tenantA = '';
let tenantB = '';
let userA: SeededUser = { id: '', email: '', password: '' };
let userB: SeededUser = { id: '', email: '', password: '' };

const adminClient = () =>
  createClient<Database>(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function authedClient(email: string, password: string) {
  const client = createClient<Database>(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!HAS_ENV)('RLS aislamiento entre tenants', () => {
  beforeAll(async () => {
    const admin = adminClient();

    // 2 tenants
    const { data: tA, error: eTA } = await admin
      .from('tenants')
      .insert({ slug: `${tag}-a`, name: `Tenant A ${tag}` })
      .select('id')
      .single();
    if (eTA || !tA) throw eTA ?? new Error('tenant A insert failed');
    tenantA = tA.id;

    const { data: tB, error: eTB } = await admin
      .from('tenants')
      .insert({ slug: `${tag}-b`, name: `Tenant B ${tag}` })
      .select('id')
      .single();
    if (eTB || !tB) throw eTB ?? new Error('tenant B insert failed');
    tenantB = tB.id;

    // 2 auth users (con email_confirm para signin inmediato)
    userA = { id: '', email: `${tag}-a@nebulab3d.test`, password: 'TestPassword1!' };
    const { data: uA, error: eUA } = await admin.auth.admin.createUser({
      email: userA.email,
      password: userA.password,
      email_confirm: true,
    });
    if (eUA || !uA.user) throw eUA ?? new Error('auth user A failed');
    userA.id = uA.user.id;

    userB = { id: '', email: `${tag}-b@nebulab3d.test`, password: 'TestPassword1!' };
    const { data: uB, error: eUB } = await admin.auth.admin.createUser({
      email: userB.email,
      password: userB.password,
      email_confirm: true,
    });
    if (eUB || !uB.user) throw eUB ?? new Error('auth user B failed');
    userB.id = uB.user.id;

    // 2 user profiles (uno por tenant)
    const { error: eProfiles } = await admin.from('users').insert([
      {
        id: userA.id,
        tenant_id: tenantA,
        role: 'owner',
        full_name: 'Owner A',
        email: userA.email,
      },
      {
        id: userB.id,
        tenant_id: tenantB,
        role: 'owner',
        full_name: 'Owner B',
        email: userB.email,
      },
    ]);
    if (eProfiles) throw eProfiles;
  });

  afterAll(async () => {
    const admin = adminClient();
    // Borrar auth users cascadea a public.users (FK ON DELETE CASCADE)
    if (userA.id) await admin.auth.admin.deleteUser(userA.id);
    if (userB.id) await admin.auth.admin.deleteUser(userB.id);
    if (tenantA) await admin.from('tenants').delete().eq('id', tenantA);
    if (tenantB) await admin.from('tenants').delete().eq('id', tenantB);
  });

  it('user A solo ve su propio tenant', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { data, error } = await a.from('tenants').select('id');
    expect(error).toBeNull();
    expect(data?.map((t) => t.id)).toEqual([tenantA]);
  });

  it('user B solo ve su propio tenant', async () => {
    const b = await authedClient(userB.email, userB.password);
    const { data, error } = await b.from('tenants').select('id');
    expect(error).toBeNull();
    expect(data?.map((t) => t.id)).toEqual([tenantB]);
  });

  it('user A no ve users de tenant B', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { data, error } = await a.from('users').select('id, tenant_id');
    expect(error).toBeNull();
    expect(data?.every((u) => u.tenant_id === tenantA)).toBe(true);
    expect(data?.find((u) => u.id === userB.id)).toBeUndefined();
  });

  it('current_tenant_id() devuelve el tenant del usuario autenticado', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { data, error } = await a.rpc('current_tenant_id');
    expect(error).toBeNull();
    expect(data).toBe(tenantA);
  });

  it('is_super_admin() es false para usuarios de tenant', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { data, error } = await a.rpc('is_super_admin');
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('current_user_role() devuelve el rol correcto', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { data, error } = await a.rpc('current_user_role');
    expect(error).toBeNull();
    expect(data).toBe('owner');
  });

  it('user A no puede insertar usuarios en tenant B', async () => {
    const a = await authedClient(userA.email, userA.password);
    const { error } = await a.from('users').insert({
      id: '00000000-0000-0000-0000-000000000000',
      tenant_id: tenantB,
      role: 'staff',
      full_name: 'Hacker',
      email: 'hacker@example.com',
    });
    // RLS rechaza el INSERT (la FK con auth.users también lo rechazaría — ambos OK)
    expect(error).not.toBeNull();
  });

  it('anon ve tenants activos pero NO ve users', async () => {
    // ENG-011 agregó policy: anon SELECT tenants WHERE status='active' (público para comensal).
    // Pero `users` sigue siendo privado para anon — verificamos eso.
    const c = createClient<Database>(URL!, ANON!);
    const { data: visibleTenants } = await c
      .from('tenants')
      .select('id, status')
      .in('id', [tenantA, tenantB]);
    expect(visibleTenants?.every((t) => t.status === 'active')).toBe(true);

    const { data: leakUsers } = await c.from('users').select('id');
    expect(leakUsers?.length ?? 0).toBe(0);
  });
});
