import { requireTenantUser } from '@/lib/auth/require-tenant';
import { fontFamily } from '@/lib/design/fonts';
import { createClient } from '@/lib/supabase/server';
import { DESIGN_FONTS, parseDesignDocument, type DesignFont } from '@/lib/validations/design';

import { LivePreview } from './live-preview';

export const dynamic = 'force-dynamic';

/**
 * Preview del BORRADOR para el iframe de /admin/design (RF-11).
 * Route group propio: sin el chrome del panel admin. Protegido por middleware
 * (prefijo /admin) + requireTenantUser. El componente LivePreview escucha
 * postMessage del editor para actualizar en vivo (Fase 2).
 */
export default async function DesignPreviewPage() {
  const me = await requireTenantUser();
  const supabase = createClient();

  const [{ data: draft }, { data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_designs')
      .select('design')
      .eq('tenant_id', me.tenant.id)
      .eq('status', 'draft')
      .maybeSingle(),
    supabase
      .from('menu_categories')
      .select('id, name, position, active')
      .eq('tenant_id', me.tenant.id)
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase
      .from('menu_items')
      .select(
        'id, category_id, name, description, price, image_url, ingredients, dietary_tags, macros, available, position',
      )
      .eq('tenant_id', me.tenant.id)
      .eq('available', true)
      .order('position', { ascending: true }),
  ]);

  const doc = draft ? parseDesignDocument(draft.design) : null;
  if (!doc) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        No hay borrador para previsualizar.
      </p>
    );
  }

  const settings =
    typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? (me.tenant.settings as Record<string, unknown>)
      : {};
  const logoUrl = typeof settings.logo_url === 'string' ? settings.logo_url : null;
  const welcomeMessage =
    typeof settings.welcome_message === 'string' ? settings.welcome_message : null;

  // Familias de las 6 fuentes para cambiar tipografía en vivo sin re-fetch.
  const fontFamilies = Object.fromEntries(DESIGN_FONTS.map((f) => [f, fontFamily(f)])) as Record<
    DesignFont,
    string
  >;

  return (
    <LivePreview
      initialDesign={doc}
      tenantName={me.tenant.name}
      logoUrl={logoUrl}
      welcomeMessage={welcomeMessage}
      categories={categories ?? []}
      items={items ?? []}
      fontFamilies={fontFamilies}
    />
  );
}
