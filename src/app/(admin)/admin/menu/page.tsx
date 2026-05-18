import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Expandable } from '@/components/ui/expandable';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { DIETARY_TAG_LABELS, type DietaryTag } from '@/lib/validations/menu';

import { CategoryInlineActions } from './category-actions';
import { ItemInlineActions } from './item-actions';

export const dynamic = 'force-dynamic';

interface CategorySlim {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

interface ItemSlim {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  dietary_tags: string[];
  position: number;
}

export default async function MenuPage() {
  const me = await requireTenantUser();
  const supabase = createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, position, active')
      .order('position', { ascending: true }),
    supabase
      .from('menu_items')
      .select(
        'id, category_id, name, description, price, image_url, available, dietary_tags, position',
      )
      .order('position', { ascending: true }),
  ]);

  const cats = (categories ?? []) as CategorySlim[];
  const allItems = (items ?? []) as ItemSlim[];

  const itemsByCategory = new Map<string, ItemSlim[]>();
  const orphans: ItemSlim[] = [];
  for (const it of allItems) {
    if (it.category_id === null) {
      orphans.push(it);
    } else {
      const list = itemsByCategory.get(it.category_id) ?? [];
      list.push(it);
      itemsByCategory.set(it.category_id, list);
    }
  }

  const canEdit = me.role === 'owner' || me.role === 'manager';
  const isEmpty = cats.length === 0 && orphans.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menú</h1>
          <p className="text-sm text-muted-foreground">
            {cats.length} categorías · {allItems.length} platos
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
      </header>

      {isEmpty ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sin categorías ni platos. Empezá creando una categoría (Entradas, Bebidas…) y después
            agregando platos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cats.map((cat, i) => (
            <CategoryBlock
              key={cat.id}
              category={cat}
              items={itemsByCategory.get(cat.id) ?? []}
              canEdit={canEdit}
              canUp={i > 0}
              canDown={i < cats.length - 1}
            />
          ))}
          {orphans.length > 0 && (
            <CategoryBlock
              category={{
                id: '__uncategorized__',
                name: 'Sin categoría',
                position: 0,
                active: true,
              }}
              items={orphans}
              canEdit={canEdit}
              canUp={false}
              canDown={false}
              isUncategorized
            />
          )}
        </div>
      )}
    </div>
  );
}

function CategoryBlock({
  category,
  items,
  canEdit,
  canUp,
  canDown,
  isUncategorized = false,
}: {
  category: CategorySlim;
  items: ItemSlim[];
  canEdit: boolean;
  canUp: boolean;
  canDown: boolean;
  isUncategorized?: boolean;
}) {
  const availableCount = items.filter((i) => i.available).length;

  return (
    <Expandable
      header={
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium">{category.name}</span>
          {!category.active && !isUncategorized && <Badge variant="secondary">inactiva</Badge>}
          <span className="text-xs text-muted-foreground">
            {availableCount} de {items.length} disponibles
          </span>
        </div>
      }
      actions={
        canEdit && !isUncategorized ? (
          <CategoryInlineActions categoryId={category.id} canUp={canUp} canDown={canDown} />
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin platos en esta categoría.</p>
      ) : (
        items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            canUp={i > 0}
            canDown={i < items.length - 1}
          />
        ))
      )}
      {canEdit && !isUncategorized && (
        <Link href={`/admin/menu/items/new?category=${category.id}`} className="block pt-1">
          <Button variant="outline" size="sm" className="w-full">
            + Plato en {category.name}
          </Button>
        </Link>
      )}
    </Expandable>
  );
}

function ItemRow({
  item,
  canEdit,
  canUp,
  canDown,
}: {
  item: ItemSlim;
  canEdit: boolean;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="flex gap-3 rounded border p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            sin foto
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate font-medium">{item.name}</span>
          <span className="shrink-0 text-sm font-semibold">
            ${Number(item.price).toLocaleString('es-CO')}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {!item.available && <Badge variant="secondary">oculto</Badge>}
            {(item.dietary_tags as DietaryTag[]).slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {DIETARY_TAG_LABELS[t] ?? t}
              </Badge>
            ))}
          </div>
          {canEdit && (
            <ItemInlineActions
              itemId={item.id}
              available={item.available}
              canUp={canUp}
              canDown={canDown}
            />
          )}
        </div>
      </div>
    </div>
  );
}
