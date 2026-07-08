import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../src/lib/supabase/database.types';

/**
 * E2E del Editor Visual del Menú (Fases 1+2):
 * crear borrador desde plantilla → editar con preview en vivo → publicar →
 * verificar el diseño en la webapp del comensal (sin sesión).
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const PASSWORD = 'TestPassword1!';
const HEADLINE = 'Bienvenidos E2E Design';

type SeedData = {
  tenantId: string;
  tenantName: string;
  slug: string;
  tableId: string;
  ownerId: string;
  ownerEmail: string;
};

function adminClient() {
  if (!URL || !SERVICE || !ANON) {
    throw new Error(
      'Faltan env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient<Database>(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signInWithCookies(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  const store = new Map<string, { name: string; value: string }>();
  const supabase = createServerClient<Database>(URL!, ANON!, {
    cookies: {
      getAll: () => Array.from(store.values()),
      setAll: (cookies) => {
        for (const c of cookies) store.set(c.name, { name: c.name, value: c.value });
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo iniciar sesión: ${error.message}`);
  const cookies = Array.from(store.values()).map((c) => ({ ...c, url: APP_URL }));
  if (cookies.length === 0) throw new Error('No se generaron cookies de sesión');
  await page.context().addCookies(cookies);
}

async function seedData(): Promise<SeedData> {
  const admin = adminClient();
  const tag = `e2e-design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = `${tag}-tenant`;
  const tenantName = `Tenant ${tag}`;

  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      slug,
      name: tenantName,
      plan: 'basic',
      status: 'active',
      settings: { onboarded_at: new Date().toISOString(), menu_template: 'default' },
    })
    .select('id')
    .single();
  if (tenantErr || !tenant) throw new Error(`No se pudo crear tenant: ${tenantErr?.message}`);

  const { data: table, error: tableErr } = await admin
    .from('tables')
    .insert({ tenant_id: tenant.id, number: '1', active: true })
    .select('id')
    .single();
  if (tableErr || !table) throw new Error(`No se pudo crear mesa: ${tableErr?.message}`);

  const { data: category, error: catErr } = await admin
    .from('menu_categories')
    .insert({ tenant_id: tenant.id, name: 'Entradas', position: 1, active: true })
    .select('id')
    .single();
  if (catErr || !category) throw new Error(`No se pudo crear categoría: ${catErr?.message}`);

  const { error: itemsErr } = await admin.from('menu_items').insert([
    {
      tenant_id: tenant.id,
      category_id: category.id,
      name: 'Arepa E2E',
      description: 'Arepa de prueba',
      price: 12000,
      ingredients: ['maiz'],
      dietary_tags: ['vegan'],
      macros: {},
      available: true,
      position: 1,
    },
  ]);
  if (itemsErr) throw new Error(`No se pudieron crear items: ${itemsErr.message}`);

  const ownerEmail = `${tag}-owner@nebulab3d.test`;
  const { data: owner, error: ownerErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (ownerErr || !owner?.user) throw new Error(`No se pudo crear owner: ${ownerErr?.message}`);

  const { error: profileErr } = await admin.from('users').insert({
    id: owner.user.id,
    tenant_id: tenant.id,
    role: 'owner',
    full_name: 'E2E Design Owner',
    email: ownerEmail,
    must_change_password: false,
  });
  if (profileErr) throw new Error(`No se pudo crear perfil: ${profileErr.message}`);

  return {
    tenantId: tenant.id,
    tenantName,
    slug,
    tableId: table.id,
    ownerId: owner.user.id,
    ownerEmail,
  };
}

async function cleanupData(seed: SeedData) {
  const admin = adminClient();
  await admin.from('menu_designs').delete().eq('tenant_id', seed.tenantId);
  await admin.from('menu_items').delete().eq('tenant_id', seed.tenantId);
  await admin.from('menu_categories').delete().eq('tenant_id', seed.tenantId);
  await admin.from('tables').delete().eq('tenant_id', seed.tenantId);
  await admin.from('users').delete().eq('id', seed.ownerId);
  await admin.auth.admin.deleteUser(seed.ownerId);
  await admin.from('tenants').delete().eq('id', seed.tenantId);
}

test.describe.serial('Editor Visual del Menú', () => {
  let seed: SeedData;

  test.beforeAll(async () => {
    seed = await seedData();
  });

  test.afterAll(async () => {
    if (seed) await cleanupData(seed);
  });

  test('owner crea un borrador desde una plantilla', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin/design');

    await expect(page.getByText('Elegí una plantilla')).toBeVisible();
    await page.getByText('Casual', { exact: true }).click();
    await page.getByRole('button', { name: 'Crear borrador con esta plantilla' }).click();

    // El editor monta con el documento del preset (navegación dura tras crear).
    await expect(page.getByText('Identidad visual')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Publicar diseño' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Encabezado (hero)' })).toBeVisible();
    // Bloque de la categoría real del tenant.
    await expect(page.getByRole('button', { name: /Categoría del menú Entradas/ })).toBeVisible();
  });

  test('edita el hero y el preview en vivo refleja el cambio', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin/design');

    await page.getByRole('button', { name: 'Encabezado (hero)' }).click();
    await page.getByPlaceholder('Ej: ¡Bienvenidos!').fill(HEADLINE);

    // Preview en vivo vía postMessage — sin recargar el iframe.
    const preview = page.frameLocator('iframe[title="Preview del diseño"]');
    await expect(preview.getByText(HEADLINE)).toBeVisible({ timeout: 15_000 });

    // Autosave: esperar a que pase el debounce (1.2s) y el guardado confirme.
    // "Guardado" es también el estado inicial, así que hay que dejar disparar
    // el timer antes de asertarlo.
    await page.waitForTimeout(1600);
    await expect(page.getByText('Guardado', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Persistencia real: recargar y verificar que el titular vino de la DB.
    await page.reload();
    await page.getByRole('button', { name: 'Encabezado (hero)' }).click();
    await expect(page.getByPlaceholder('Ej: ¡Bienvenidos!')).toHaveValue(HEADLINE);
  });

  test('publica el diseño', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin/design');

    await page.getByRole('button', { name: 'Publicar diseño' }).click();
    await expect(page.getByText('Diseño publicado')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Versión 1 publicada/)).toBeVisible({ timeout: 20_000 });
  });

  test('el comensal (sin sesión) ve el diseño publicado', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/r/${seed.slug}/t/${seed.tableId}`);
    await expect(page.getByRole('heading', { name: seed.tenantName })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(HEADLINE)).toBeVisible();
    await expect(page.getByText('Arepa E2E')).toBeVisible();
    // Widgets del sistema presentes (RF-14): llamada al mesero.
    await expect(page.getByText(/mesero/i).first()).toBeVisible();

    await context.close();
  });

  test('crea una categoría desde el editor y aparece como bloque', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin/design');

    await expect(page.getByRole('heading', { name: 'Categorías y platos' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByPlaceholder('Ej: Postres').fill('Postres E2E');
    await page.getByRole('button', { name: 'Crear', exact: true }).click();

    // La categoría nueva se agrega automáticamente como bloque del diseño,
    // desbloqueando la publicación aunque el tenant no tuviera categorías.
    await expect(page.getByRole('button', { name: /Categoría del menú Postres E2E/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('el panel de menú lista los platos con opción de subir foto', async ({ page }) => {
    await signInWithCookies(page, seed.ownerEmail, PASSWORD);
    await page.goto('/admin/design');

    await expect(page.getByRole('heading', { name: 'Categorías y platos' })).toBeVisible({
      timeout: 15_000,
    });
    // El plato sembrado aparece en el panel (dentro de su categoría) con la
    // opción de subir/asignar una foto.
    await expect(page.getByText('Arepa E2E')).toBeVisible();
    await expect(page.getByText('Subir foto').first()).toBeVisible();
  });
});
