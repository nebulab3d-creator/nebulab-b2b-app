import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

import { EditCategoryForm } from './edit-category-form';

export default async function CategoryDetailPage({ params }: { params: { id: string } }) {
  const me = await requireTenantUser();
  const supabase = createClient();
  const { data: cat } = await supabase
    .from('menu_categories')
    .select('id, name, position, active')
    .eq('id', params.id)
    .maybeSingle();
  if (!cat) notFound();

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, available, position, price')
    .eq('category_id', cat.id)
    .order('position', { ascending: true });

  const canEdit = me.role === 'owner' || me.role === 'manager';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/menu" className="text-xs text-muted-foreground hover:underline">
        ← Menú
      </Link>
      <h1 className="text-2xl font-bold">{cat.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Editar categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <EditCategoryForm
              id={cat.id}
              initialName={cat.name}
              initialPosition={cat.position}
              initialActive={cat.active}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Solo owner o manager puede editar.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platos en esta categoría ({items?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin platos asignados.</p>
          ) : (
            <ul className="space-y-2">
              {items?.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between rounded border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{it.name}</span>
                    {!it.available && <Badge variant="secondary">oculto</Badge>}
                  </div>
                  <Link
                    href={`/admin/menu/items/${it.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
