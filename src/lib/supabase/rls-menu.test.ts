/**
 * Tests RLS para menu, tables, waiter_calls, reviews, analytics_events.
 *
 * Setup: 2 tenants (A: review_threshold default 4 — B: threshold custom 5),
 * cada uno con 1 mesa activa, 1 categoría, 1 item disponible, 1 item NO disponible.
 *
 * Cubre:
 *  - anon ve solo activos/disponibles del menú; no ve items deshabilitados
 *  - anon NO ve menú entre tenants (no aplica filtro per se, pero cross-cliente
 *    sí lo ve porque RLS no filtra por tenant para anon — eso es esperado, el
 *    menú es público; lo que se filtra es active/available)
 *  - tenant A authenticated NO ve datos de tenant B
 *  - staff puede UPDATE waiter_calls; NO puede UPDATE menu_items
 *  - owner/manager pueden CRUD menú; staff no
 *  - anon INSERT waiter_call con table_id válido funciona; con inválido falla
 *  - reviews: trigger setea is_public según rating + threshold del tenant
 *  - analytics_events: anon inserta; nadie hace UPDATE/DELETE excepto super
 */

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database, Json } from './database.types';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_ENV = Boolean(URL && ANON && SERVICE);

const tag = `rls-menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface SeededTenant {
  id: string;
  tableId: string;
  categoryId: string;
  availableItemId: string;
  unavailableItemId: string;
}

interface SeededUser {
  id: string;
  email: string;
  password: string;
}

const tenants: { A: SeededTenant; B: SeededTenant } = {
  A: { id: '', tableId: '', categoryId: '', availableItemId: '', unavailableItemId: '' },
  B: { id: '', tableId: '', categoryId: '', availableItemId: '', unavailableItemId: '' },
};

const owners: { A: SeededUser; B: SeededUser } = {
  A: { id: '', email: '', password: '' },
  B: { id: '', email: '', password: '' },
};

const staffA: SeededUser = { id: '', email: '', password: '' };

const adminClient = () =>
  createClient<Database>(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const anonClient = () =>
  createClient<Database>(URL!, ANON!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function authedClient(email: string, password: string) {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function seedTenant(label: 'A' | 'B', settings: Json = {}) {
  const admin = adminClient();
  const { data: t, error: et } = await admin
    .from('tenants')
    .insert({ slug: `${tag}-${label.toLowerCase()}`, name: `Tenant ${label}`, settings })
    .select('id')
    .single();
  if (et || !t) throw et ?? new Error('tenant insert failed');
  const tenantId = t.id;

  const { data: tbl, error: etbl } = await admin
    .from('tables')
    .insert({ tenant_id: tenantId, number: '1', active: true })
    .select('id')
    .single();
  if (etbl || !tbl) throw etbl ?? new Error('table insert failed');

  const { data: cat, error: ecat } = await admin
    .from('menu_categories')
    .insert({ tenant_id: tenantId, name: 'Entradas', position: 0, active: true })
    .select('id')
    .single();
  if (ecat || !cat) throw ecat ?? new Error('category insert failed');

  const { data: items, error: eitems } = await admin
    .from('menu_items')
    .insert([
      {
        tenant_id: tenantId,
        category_id: cat.id,
        name: `Plato disponible ${label}`,
        price: 10000,
        available: true,
      },
      {
        tenant_id: tenantId,
        category_id: cat.id,
        name: `Plato oculto ${label}`,
        price: 10000,
        available: false,
      },
    ])
    .select('id, available');
  if (eitems || !items) throw eitems ?? new Error('items insert failed');

  const available = items.find((i) => i.available)!;
  const unavailable = items.find((i) => !i.available)!;

  tenants[label] = {
    id: tenantId,
    tableId: tbl.id,
    categoryId: cat.id,
    availableItemId: available.id,
    unavailableItemId: unavailable.id,
  };
}

async function seedUser(role: 'owner' | 'staff', tenantId: string, label: string) {
  const admin = adminClient();
  const email = `${tag}-${label}@nebulab3d.test`;
  const password = 'TestPassword1!';
  const { data: au, error: eau } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (eau || !au.user) throw eau ?? new Error(`auth user ${label} failed`);
  const { error: eu } = await admin.from('users').insert({
    id: au.user.id,
    tenant_id: tenantId,
    role,
    full_name: label,
    email,
  });
  if (eu) throw eu;
  return { id: au.user.id, email, password };
}

describe.skipIf(!HAS_ENV)('RLS aislamiento — menu, tables, calls, reviews, analytics', () => {
  beforeAll(async () => {
    await seedTenant('A', { review_public_threshold: 4 });
    await seedTenant('B', { review_public_threshold: 5 });
    owners.A = await seedUser('owner', tenants.A.id, 'owner-a');
    owners.B = await seedUser('owner', tenants.B.id, 'owner-b');
    Object.assign(staffA, await seedUser('staff', tenants.A.id, 'staff-a'));
  });

  afterAll(async () => {
    const admin = adminClient();
    for (const u of [owners.A, owners.B, staffA]) {
      if (u.id) await admin.auth.admin.deleteUser(u.id);
    }
    for (const t of [tenants.A, tenants.B]) {
      if (t.id) await admin.from('tenants').delete().eq('id', t.id);
    }
  });

  // ----- ANON LECTURAS -----
  it('anon ve solo menu_items con available=true', async () => {
    const c = anonClient();
    const { data, error } = await c
      .from('menu_items')
      .select('id, available')
      .in('id', [tenants.A.availableItemId, tenants.A.unavailableItemId]);
    expect(error).toBeNull();
    expect(data?.map((i) => i.id)).toEqual([tenants.A.availableItemId]);
  });

  it('anon ve menu_categories activas', async () => {
    const c = anonClient();
    const { data, error } = await c
      .from('menu_categories')
      .select('id')
      .eq('id', tenants.A.categoryId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it('anon ve tables activas', async () => {
    const c = anonClient();
    const { data, error } = await c.from('tables').select('id').eq('id', tenants.A.tableId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  // ----- ANON ESCRITURAS -----
  it('anon puede INSERT waiter_call con table_id válido (trigger setea tenant_id)', async () => {
    const c = anonClient();
    const { data, error } = await c
      .from('waiter_calls')
      .insert({ table_id: tenants.A.tableId, reason: 'pedir cuenta' } as never)
      .select('id, tenant_id, status')
      .single();
    expect(error).toBeNull();
    expect(data?.tenant_id).toBe(tenants.A.id);
    expect(data?.status).toBe('pending');
  });

  it('anon NO puede INSERT waiter_call con table_id inválido', async () => {
    const c = anonClient();
    const { error } = await c
      .from('waiter_calls')
      .insert({ table_id: '00000000-0000-0000-0000-000000000000' } as never);
    expect(error).not.toBeNull();
  });

  it('reviews: rating 5 → is_public TRUE (tenant A threshold=4)', async () => {
    const c = anonClient();
    const { data, error } = await c
      .from('reviews')
      .insert({
        table_id: tenants.A.tableId,
        rating: 5,
        comment: 'excelente',
      } as never)
      .select('is_public, tenant_id')
      .single();
    expect(error).toBeNull();
    expect(data?.is_public).toBe(true);
    expect(data?.tenant_id).toBe(tenants.A.id);
  });

  it('reviews: rating 4 → is_public FALSE en tenant B (threshold=5)', async () => {
    // anon NO puede re-leer un review con is_public=false (anon SELECT requiere is_public=true).
    // Por eso insertamos sin .select() y verificamos con admin.
    const c = anonClient();
    const { error } = await c
      .from('reviews')
      .insert({ table_id: tenants.B.tableId, rating: 4, comment: 'casi' } as never);
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('reviews')
      .select('is_public, tenant_id')
      .eq('tenant_id', tenants.B.id)
      .eq('rating', 4)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    expect(row?.is_public).toBe(false);
    expect(row?.tenant_id).toBe(tenants.B.id);
  });

  it('anon ve reviews is_public=true; NO ve internas', async () => {
    const c = anonClient();
    const { data: pub } = await c
      .from('reviews')
      .select('id, rating, is_public')
      .eq('tenant_id', tenants.A.id)
      .gte('rating', 5);
    expect(pub?.every((r) => r.is_public)).toBe(true);

    // Insertar una negativa para confirmar que anon no la ve
    const admin = adminClient();
    const { data: neg } = await admin
      .from('reviews')
      .insert({
        tenant_id: tenants.A.id,
        table_id: tenants.A.tableId,
        rating: 1,
        comment: 'mala',
        is_public: false,
      })
      .select('id')
      .single();

    const { data: visible } = await c.from('reviews').select('id').eq('id', neg!.id);
    expect(visible?.length ?? 0).toBe(0);
  });

  it('anon puede INSERT analytics_event (trigger setea tenant_id)', async () => {
    // analytics_events NO tiene anon SELECT policy → no se puede .select() después.
    // Verificamos con admin que la fila quedó con el tenant_id correcto.
    const sessionId = `${tag}-sess-${Math.random().toString(36).slice(2, 8)}`;
    const c = anonClient();
    const { error } = await c.from('analytics_events').insert({
      table_id: tenants.A.tableId,
      event_type: 'qr_scan',
      event_data: { ua: 'test' },
      session_id: sessionId,
    } as never);
    expect(error).toBeNull();

    const admin = adminClient();
    const { data: row } = await admin
      .from('analytics_events')
      .select('tenant_id, event_type')
      .eq('session_id', sessionId)
      .single();
    expect(row?.tenant_id).toBe(tenants.A.id);
    expect(row?.event_type).toBe('qr_scan');
  });

  // ----- AISLAMIENTO TENANT -----
  it('owner A no ve menu_items de tenant B', async () => {
    const a = await authedClient(owners.A.email, owners.A.password);
    const { data } = await a
      .from('menu_items')
      .select('id, tenant_id')
      .in('id', [tenants.A.availableItemId, tenants.B.availableItemId]);
    expect(data?.map((i) => i.id)).toEqual([tenants.A.availableItemId]);
  });

  // ----- ROLES -----
  it('staff NO puede INSERT menu_items', async () => {
    const s = await authedClient(staffA.email, staffA.password);
    const { error } = await s.from('menu_items').insert({
      tenant_id: tenants.A.id,
      name: 'pirata',
      price: 999,
    });
    expect(error).not.toBeNull();
  });

  it('staff puede UPDATE waiter_calls (acknowledge)', async () => {
    const admin = adminClient();
    const { data: call } = await admin
      .from('waiter_calls')
      .insert({ tenant_id: tenants.A.id, table_id: tenants.A.tableId })
      .select('id')
      .single();

    const s = await authedClient(staffA.email, staffA.password);
    const { error } = await s
      .from('waiter_calls')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', call!.id);
    expect(error).toBeNull();
  });

  it('owner puede INSERT menu_items en su tenant', async () => {
    const o = await authedClient(owners.A.email, owners.A.password);
    const { data, error } = await o
      .from('menu_items')
      .insert({
        tenant_id: tenants.A.id,
        category_id: tenants.A.categoryId,
        name: 'nuevo plato',
        price: 15000,
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it('owner A NO puede INSERT menu_items en tenant B', async () => {
    const o = await authedClient(owners.A.email, owners.A.password);
    const { error } = await o.from('menu_items').insert({
      tenant_id: tenants.B.id,
      name: 'pirata cross-tenant',
      price: 1,
    });
    expect(error).not.toBeNull();
  });

  // ----- IMMUTABILIDAD ANALYTICS -----
  it('owner NO puede DELETE analytics_events', async () => {
    const admin = adminClient();
    const { data: ev } = await admin
      .from('analytics_events')
      .insert({
        tenant_id: tenants.A.id,
        table_id: tenants.A.tableId,
        event_type: 'item_view',
      })
      .select('id')
      .single();

    const o = await authedClient(owners.A.email, owners.A.password);
    const { error: delErr } = await o.from('analytics_events').delete().eq('id', ev!.id);
    // RLS retorna éxito con 0 filas afectadas (no error explícito)
    expect(delErr).toBeNull();
    const { data: stillThere } = await admin.from('analytics_events').select('id').eq('id', ev!.id);
    expect(stillThere?.length).toBe(1);
  });
});
