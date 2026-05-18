import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

import { ItemForm } from '../item-form';

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  await requireTenantUser(['owner', 'manager']);
  const supabase = createClient();
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name')
    .order('position', { ascending: true });

  // Pre-seleccionar categoría si vino por query (?category=<id>) y existe
  const presetCategoryId =
    typeof searchParams.category === 'string' &&
    (categories ?? []).some((c) => c.id === searchParams.category)
      ? searchParams.category
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/menu" className="text-xs text-muted-foreground hover:underline">
        ← Menú
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo plato</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            mode="create"
            categories={categories ?? []}
            initial={{
              category_id: presetCategoryId,
              name: '',
              description: '',
              price: 0,
              ingredients: [],
              dietary_tags: [],
              macros: {},
              available: true,
              position: 0,
              image_url: null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
