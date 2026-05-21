import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../src/lib/supabase/database.types';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const COOKIE_URL = APP_URL;

const PASSWORD = 'TestPassword1!';

type SeedData = {
  tenantId: string;
  tenantName: string;
  slug: string;
  tableId: string;
  tableNumber: string;
  ownerId: string;
  ownerEmail: string;
  superAdminId: string;
  superAdminEmail: string;
};

type StoredCookie = {
  name: string;
  value: string;
  options?: {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    expires?: number | Date;
  };
};

function requireEnv() {
  if (!URL || !SERVICE || !ANON) {
    throw new Error(
      'Faltan env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY',
    );
  }
}

function adminClient() {
  requireEnv();
  return createClient<Database>(URL!, SERVICE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertData<T>(data: T | null, error: unknown, label: string): T {
  if (error || !data) {
    const msg =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message)
        : 'error desconocido';
    throw new Error(`${label}: ${msg}`);
  }
  return data;
}

function createCookieStore() {
  const store = new Map<string, StoredCookie>();
  return {
    getAll(): StoredCookie[] {
      return Array.from(store.values());
    },
    setAll(cookiesToSet: StoredCookie[]) {
      for (const cookie of cookiesToSet) store.set(cookie.name, cookie);
    },
  };
}

function normalizeSameSite(value?: string): 'Lax' | 'Strict' | 'None' | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === 'lax') return 'Lax';
  if (v === 'strict') return 'Strict';
  if (v === 'none') return 'None';
  return undefined;
}

function normalizeExpires(expires?: number | Date): number | undefined {
  if (!expires) return undefined;
  if (typeof expires === 'number') return expires;
  return Math.floor(expires.getTime() / 1000);
}

async function signInWithCookies(page: Page, email: string, password: string) {
  if (!URL || !ANON) {
    throw new Error('Faltan env vars: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  await page.context().clearCookies();
  const cookieStore = createCookieStore();
  const supabase = createServerClient<Database>(URL, ANON, {
    cookies: cookieStore,
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesion: ${error.message}`);

  const cookies = cookieStore.getAll().map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: COOKIE_URL,
    httpOnly: cookie.options?.httpOnly ?? false,
    secure: cookie.options?.secure ?? false,
    sameSite: normalizeSameSite(cookie.options?.sameSite),
    expires: normalizeExpires(cookie.options?.expires),
  }));
  if (cookies.length === 0) {
    throw new Error('No se generaron cookies de sesion');
  }
  await page.context().addCookies(cookies);
}

async function seedData(): Promise<SeedData> {
  const admin = adminClient();
  const tag = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = `${tag}-tenant`;
  const tenantName = `Tenant ${tag}`;
  const tableNumber = '1';
  const now = new Date().toISOString();

  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      slug,
      name: tenantName,
      plan: 'basic',
      status: 'active',
      settings: {
        onboarded_at: now,
        menu_template: 'default',
        brand_color: '#dc2626',
        welcome_message: 'Bienvenido E2E',
      },
    })
    .select('id')
    .single();
  const tenantRow = assertData(tenant, tenantErr, 'No se pudo crear tenant');

  const { data: table, error: tableErr } = await admin
    .from('tables')
    .insert({
      tenant_id: tenantRow.id,
      number: tableNumber,
      active: true,
    })
    .select('id')
    .single();
  const tableRow = assertData(table, tableErr, 'No se pudo crear mesa');

  const { data: category, error: categoryErr } = await admin
    .from('menu_categories')
    .insert({
      tenant_id: tenantRow.id,
      name: 'Entradas',
      position: 1,
      active: true,
    })
    .select('id')
    .single();
  const categoryRow = assertData(category, categoryErr, 'No se pudo crear categoria');

  const { error: itemsErr } = await admin.from('menu_items').insert([
    {
      tenant_id: tenantRow.id,
      category_id: categoryRow.id,
      name: 'Arepa E2E',
      description: 'Arepa de prueba',
      price: 12000,
      ingredients: ['maiz'],
      dietary_tags: ['vegan'],
      macros: {},
      available: true,
      position: 1,
    },
    {
      tenant_id: tenantRow.id,
      category_id: categoryRow.id,
      name: 'Chicharron E2E',
      description: 'Plato de prueba',
      price: 18000,
      ingredients: ['cerdo'],
      dietary_tags: ['spicy'],
      macros: {},
      available: true,
      position: 2,
    },
  ]);
  if (itemsErr) throw new Error(`No se pudieron crear items: ${itemsErr.message ?? 'error'}`);

  const ownerEmail = `${tag}-owner@nebulab3d.test`;
  const { data: owner, error: ownerErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (ownerErr || !owner?.user) {
    throw new Error(`No se pudo crear owner auth: ${ownerErr?.message ?? 'error'}`);
  }

  const { error: profileErr } = await admin.from('users').insert({
    id: owner.user.id,
    tenant_id: tenantRow.id,
    role: 'owner',
    full_name: 'E2E Owner',
    email: ownerEmail,
    must_change_password: false,
  });
  if (profileErr)
    throw new Error(`No se pudo crear perfil owner: ${profileErr.message ?? 'error'}`);

  const superAdminEmail = `${tag}-super@nebulab3d.test`;
  const { data: superUser, error: superErr } = await admin.auth.admin.createUser({
    email: superAdminEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (superErr || !superUser?.user) {
    throw new Error(`No se pudo crear super-admin auth: ${superErr?.message ?? 'error'}`);
  }

  const { error: superRowErr } = await admin.from('super_admins').insert({ id: superUser.user.id });
  if (superRowErr) {
    throw new Error(`No se pudo crear super_admins row: ${superRowErr.message ?? 'error'}`);
  }

  return {
    tenantId: tenantRow.id,
    tenantName,
    slug,
    tableId: tableRow.id,
    tableNumber,
    ownerId: owner.user.id,
    ownerEmail,
    superAdminId: superUser.user.id,
    superAdminEmail,
  };
}

async function cleanupData(seed: SeedData) {
  const admin = adminClient();
  await admin.from('menu_items').delete().eq('tenant_id', seed.tenantId);
  await admin.from('menu_categories').delete().eq('tenant_id', seed.tenantId);
  await admin.from('tables').delete().eq('tenant_id', seed.tenantId);
  await admin.from('users').delete().eq('id', seed.ownerId);
  await admin.from('super_admins').delete().eq('id', seed.superAdminId);
  await admin.auth.admin.deleteUser(seed.ownerId);
  await admin.auth.admin.deleteUser(seed.superAdminId);
  await admin.from('tenants').delete().eq('id', seed.tenantId);
}

test.describe.serial('E2E smoke', () => {
  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedData();
  });

  test.afterAll(async () => {
    if (seed) await cleanupData(seed);
  });

  test('comensal: carga menu y filtra busqueda', async ({ page }) => {
    await page.goto(`/r/${seed.slug}/t/${seed.tableId}`);

    await expect(page.getByText(seed.tenantName)).toBeVisible();
    await expect(page.getByText(`Mesa ${seed.tableNumber}`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entradas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Arepa E2E/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Chicharron E2E/ })).toBeVisible();

    const search = page.getByPlaceholder(/Buscar plato/);
    await search.fill('Arepa');
    await expect(page.getByRole('button', { name: /Arepa E2E/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Chicharron E2E/ })).toHaveCount(0);
  });

  test('admin: sesion y dashboard', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Bienvenido, E2E/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(`Panel de ${seed.tenantName}`)).toBeVisible();
  });

  test('super-admin: sesion y listado de tenants', async ({ page }) => {
    await signInWithCookies(page, seed.superAdminEmail, PASSWORD);
    await page.goto('/super');
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('cell', { name: seed.tenantName })).toBeVisible();
  });
});
