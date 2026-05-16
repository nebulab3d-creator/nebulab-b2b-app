import { notFound } from 'next/navigation';

import { fetchActiveTable, getPublicMenuCached } from '@/lib/comensal/queries';

import { MenuExperience } from './menu-experience';
import { TrackQrScan } from './track-qr-scan';

export const revalidate = 60;

export default async function ComensalMenuPage({
  params,
}: {
  params: { slug: string; tableId: string };
}) {
  const menu = await getPublicMenuCached(params.slug);
  if (!menu) notFound();

  const table = await fetchActiveTable(menu.tenant.id, params.tableId);
  if (!table) notFound();

  const settings =
    typeof menu.tenant.settings === 'object' && menu.tenant.settings !== null
      ? (menu.tenant.settings as Record<string, unknown>)
      : {};

  const brandColor = typeof settings.brand_color === 'string' ? settings.brand_color : null;
  const logoUrl = typeof settings.logo_url === 'string' ? settings.logo_url : null;
  const welcomeMessage =
    typeof settings.welcome_message === 'string' ? settings.welcome_message : null;

  // Filtrar lo que el RLS para anon ya filtraría (defensa en profundidad y consistencia
  // si se llama vía cache que no aplica RLS por usuario):
  const visibleCategories = menu.categories.filter((c) => c.active);
  const visibleItems = menu.items.filter((i) => i.available);

  return (
    <>
      <TrackQrScan tableId={table.id} />
      <MenuExperience
        tenantName={menu.tenant.name}
        tableNumber={table.number}
        brandColor={brandColor}
        logoUrl={logoUrl}
        welcomeMessage={welcomeMessage}
        categories={visibleCategories}
        items={visibleItems}
        tableId={table.id}
      />
    </>
  );
}
