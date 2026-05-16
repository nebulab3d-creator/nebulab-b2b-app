import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

export default async function ItemsListPage() {
  const me = await requireTenantUser();
  const supabase = createClient();

  const [{ data: items }, { data: categories }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, price, available, image_url, category_id, position')
      .order('position', { ascending: true }),
    supabase.from('menu_categories').select('id, name').order('position'),
  ]);

  const catName = new Map<string, string>();
  for (const c of categories ?? []) catName.set(c.id, c.name);

  const canEdit = me.role === 'owner' || me.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/menu" className="text-xs text-muted-foreground hover:underline">
            ← Menú
          </Link>
          <h1 className="text-2xl font-bold">Todos los platos</h1>
          <p className="text-sm text-muted-foreground">{items?.length ?? 0} platos</p>
        </div>
        {canEdit && (
          <Link href="/admin/menu/items/new">
            <Button>+ Plato</Button>
          </Link>
        )}
      </div>

      {(items ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No hay platos. Creá el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items?.map((it) => (
            <Link
              key={it.id}
              href={`/admin/menu/items/${it.id}`}
              className="flex gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
                {it.image_url ? (
                  <Image
                    src={it.image_url}
                    alt={it.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    sin foto
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{it.name}</span>
                  {!it.available && <Badge variant="secondary">oculto</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${it.price?.toLocaleString('es-CO')} ·{' '}
                  {it.category_id
                    ? (catName.get(it.category_id) ?? 'sin categoría')
                    : 'sin categoría'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
