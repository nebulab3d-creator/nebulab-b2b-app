import 'server-only';

import { unstable_cache } from 'next/cache';

import type { Database } from '@/lib/supabase/database.types';
import { createClient as createServerClient } from '@/lib/supabase/server';

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
 * Carga el menú público de un tenant. Se cachea con tag `tenant-menu:<id>`
 * que las Server Actions del admin invalidan al modificar el menú.
 *
 * RLS para anon ya filtra:
 *   - tenants: status='active' implícito porque el comensal entra solo si el slug existe
 *   - menu_categories: active=true
 *   - menu_items: available=true
 *
 * (Nota: el RLS de `tenants` para anon NO está definido aún — anon NO puede leer tenants.
 * Por eso usamos el server client desde Server Component, que corre con anon role del visitante,
 * pero la query de tenant la hacemos por slug y necesitamos que la policy lo permita.
 * Workaround MVP: agregamos una policy mínima de anon SELECT sobre tenants en la próxima migración.)
 */
async function fetchPublicMenu(slug: string): Promise<PublicMenu | null> {
  const supabase = createServerClient();

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
