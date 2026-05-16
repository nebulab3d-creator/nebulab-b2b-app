import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

import { ReorderButtons } from './reorder-buttons';

export default async function MenuPage() {
  const me = await requireTenantUser();
  const supabase = createClient();

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name, position, active')
    .order('position', { ascending: true });

  // Conteo de items por categoría (single round trip via group + count en cliente)
  const { data: items } = await supabase.from('menu_items').select('id, category_id, available');

  const counts = new Map<string, { total: number; available: number }>();
  for (const it of items ?? []) {
    const key = it.category_id ?? 'uncategorized';
    const cur = counts.get(key) ?? { total: 0, available: 0 };
    cur.total += 1;
    if (it.available) cur.available += 1;
    counts.set(key, cur);
  }

  const canEdit = me.role === 'owner' || me.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menú</h1>
          <p className="text-sm text-muted-foreground">
            {categories?.length ?? 0} categorías · {items?.length ?? 0} platos
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href="/admin/menu/categories/new">
              <Button variant="outline">+ Categoría</Button>
            </Link>
            <Link href="/admin/menu/items/new">
              <Button>+ Plato</Button>
            </Link>
          </div>
        )}
      </div>

      {(categories ?? []).length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No hay categorías. Creá la primera.</p>
        </div>
      )}

      <div className="space-y-3">
        {(categories ?? []).map((c, i) => {
          const ct = counts.get(c.id) ?? { total: 0, available: 0 };
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-md border p-4"
            >
              <div className="flex items-center gap-3">
                {canEdit && (
                  <ReorderButtons
                    id={c.id}
                    canUp={i > 0}
                    canDown={i < (categories?.length ?? 0) - 1}
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {!c.active && <Badge variant="secondary">inactiva</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ct.available} de {ct.total} platos disponibles
                  </div>
                </div>
              </div>
              <Link
                href={`/admin/menu/categories/${c.id}`}
                className="text-sm text-primary hover:underline"
              >
                Editar
              </Link>
            </div>
          );
        })}
      </div>

      {counts.has('uncategorized') && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Hay {counts.get('uncategorized')?.total} plato(s) sin categoría asignada.{' '}
          <Link href="/admin/menu/items" className="underline">
            Ver todos los platos
          </Link>{' '}
          para arreglarlo.
        </div>
      )}
    </div>
  );
}
