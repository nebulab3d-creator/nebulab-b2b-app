import 'server-only';

import { unstable_cache } from 'next/cache';

import { createCacheableAnonClient } from '@/lib/supabase/cacheable';
import type { Database } from '@/lib/supabase/database.types';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { parseDesignDocument, type DesignDocument } from '@/lib/validations/design';

type Tenant = Pick<
  Database['public']['Tables']['tenants']['Row'],
  'id' | 'slug' | 'name' | 'status' | 'settings'
>;

type Table = Pick<Database['public']['Tables']['tables']['Row'], 'id' | 'number' | 'tenant_id'>;

type Category = Pick<
  Database['public']['Tables']['menu_categories']['Row'],
  'id' | 'name' | 'position' | 'active'
>;

type Item = Pick<
  Database['public']['Tables']['menu_items']['Row'],
  | 'id'
  | 'category_id'
  | 'name'
  | 'description'
  | 'price'
  | 'image_url'
  | 'ingredients'
  | 'dietary_tags'
  | 'macros'
  | 'available'
  | 'position'
>;

export interface PublicMenu {
  tenant: Tenant;
  categories: Category[];
  items: Item[];
}

/**
 * Carga el menú público de un tenant. Se cachea con tag `tenant-menu-by-slug:<slug>`
 * que las Server Actions del admin invalidan al modificar el menú.
 *
 * IMPORTANTE: usa `createCacheableAnonClient` (sin cookies). El client de
 * `server.ts` usa `cookies()` y Next 14 PROHÍBE llamarla dentro de
 * `unstable_cache(...)`. Para reads del comensal (anon) las cookies no aportan.
 *
 * RLS de anon ya filtra:
 *   - tenants: status='active' (policy `tenants_anon_select_active`)
 *   - menu_categories: active=true
 *   - menu_items: available=true
 */
async function fetchPublicMenu(slug: string): Promise<PublicMenu | null> {
  const supabase = createCacheableAnonClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, name, status, settings')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  if (!tenant) return null;

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, position, active')
      .eq('tenant_id', tenant.id)
      .order('position', { ascending: true }),
    supabase
      .from('menu_items')
      .select(
        'id, category_id, name, description, price, image_url, ingredients, dietary_tags, macros, available, position',
      )
      .eq('tenant_id', tenant.id)
      .order('position', { ascending: true }),
  ]);

  return {
    tenant,
    categories: categories ?? [],
    items: items ?? [],
  };
}

export function getPublicMenuCached(slug: string): Promise<PublicMenu | null> {
  return unstable_cache(() => fetchPublicMenu(slug), ['public-menu', slug], {
    revalidate: 60,
    tags: [`tenant-menu-by-slug:${slug}`],
  })();
}

/**
 * Diseño publicado del tenant (Editor Visual). Cacheado con tag
 * `tenant-design-by-slug:<slug>` que publishDesignAction invalida.
 * RLS anon solo permite leer filas published de tenants activos.
 * Devuelve null si no hay diseño publicado o no valida contra el schema
 * (el caller cae al renderer legacy).
 */
async function fetchPublishedDesign(tenantId: string): Promise<DesignDocument | null> {
  const supabase = createCacheableAnonClient();
  const { data } = await supabase
    .from('menu_designs')
    .select('design')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .maybeSingle();
  if (!data) return null;
  return parseDesignDocument(data.design);
}

export function getPublishedDesignCached(
  slug: string,
  tenantId: string,
): Promise<DesignDocument | null> {
  return unstable_cache(() => fetchPublishedDesign(tenantId), ['published-design', slug], {
    revalidate: 60,
    tags: [`tenant-design-by-slug:${slug}`],
  })();
}

export async function fetchActiveTable(tenantId: string, tableId: string): Promise<Table | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('tables')
    .select('id, number, tenant_id')
    .eq('id', tableId)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .maybeSingle();
  return data;
}
