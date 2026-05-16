import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import type { DietaryTag } from '@/lib/validations/menu';

import { ItemForm } from '../item-form';

export default async function EditItemPage({ params }: { params: { id: string } }) {
  await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();
  const [{ data: item }, { data: categories }] = await Promise.all([
    supabase
      .from('menu_items')
      .select(
        'id, category_id, name, description, price, ingredients, dietary_tags, macros, available, position, image_url',
      )
      .eq('id', params.id)
      .maybeSingle(),
    supabase.from('menu_categories').select('id, name').order('position', { ascending: true }),
  ]);
  if (!item) notFound();

  const macros =
    typeof item.macros === 'object' && item.macros !== null
      ? (item.macros as { calories?: number; protein?: number; carbs?: number; fat?: number })
      : {};

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/menu/items" className="text-xs text-muted-foreground hover:underline">
        ← Platos
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Editar plato</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            mode="edit"
            categories={categories ?? []}
            initial={{
              id: item.id,
              category_id: item.category_id,
              name: item.name,
              description: item.description ?? '',
              price: Number(item.price ?? 0),
              ingredients: item.ingredients ?? [],
              dietary_tags: (item.dietary_tags ?? []) as DietaryTag[],
              macros,
              available: item.available,
              position: item.position,
              image_url: item.image_url,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
