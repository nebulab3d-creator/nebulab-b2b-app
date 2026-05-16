'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackComensalEvent } from '@/lib/comensal/analytics';
import type { Json } from '@/lib/supabase/database.types';
import { DIETARY_TAG_LABELS, DIETARY_TAGS, type DietaryTag } from '@/lib/validations/menu';

import { ItemDetailDrawer } from './item-detail-drawer';

interface Category {
  id: string;
  name: string;
  position: number;
  active: boolean;
}

interface Item {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  ingredients: string[];
  dietary_tags: string[];
  macros: Json | null;
  available: boolean;
  position: number;
}

interface Props {
  tenantName: string;
  tableNumber: string;
  brandColor: string | null;
  logoUrl: string | null;
  welcomeMessage: string | null;
  categories: Category[];
  items: Item[];
  tableId: string;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function MenuExperience({
  tenantName,
  tableNumber,
  brandColor,
  logoUrl,
  welcomeMessage,
  categories,
  items,
  tableId,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null);
  const [filters, setFilters] = useState<Set<DietaryTag>>(new Set());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    void trackComensalEvent({ tableId, event: 'menu_loaded' });
  }, [tableId]);

  const filteredItems = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((it) => {
      if (filters.size > 0) {
        for (const f of filters) {
          if (!(it.dietary_tags ?? []).includes(f)) return false;
        }
      }
      if (q) {
        const haystack = normalize(
          [it.name, it.description ?? '', ...(it.ingredients ?? [])].join(' '),
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters, query]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filteredItems) {
      const key = it.category_id ?? '__none__';
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return map;
  }, [filteredItems]);

  const cssVars = brandColor ? ({ '--nb3d-brand': brandColor } as React.CSSProperties) : undefined;

  return (
    <div className="flex min-h-screen flex-col" style={cssVars}>
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenantName} className="h-10 w-10 rounded object-cover" />
            )}
            <div>
              <div className="text-base leading-tight font-semibold">{tenantName}</div>
              <div className="text-xs text-muted-foreground">Mesa {tableNumber}</div>
            </div>
          </div>
        </div>
        {welcomeMessage && (
          <div className="bg-muted/30 px-4 py-2 text-center text-xs">{welcomeMessage}</div>
        )}
        {/* Tabs categorías */}
        {categories.length > 0 && (
          <nav className="flex gap-1 overflow-x-auto px-4 py-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCategory(c.id);
                  document
                    .getElementById(`cat-${c.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  activeCategory === c.id
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground'
                }`}
                style={
                  activeCategory === c.id && brandColor
                    ? { backgroundColor: brandColor, color: 'white' }
                    : undefined
                }
              >
                {c.name}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Filtros + búsqueda */}
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
        <Input
          placeholder="Buscar plato o ingrediente…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length === 1) {
              void trackComensalEvent({ tableId, event: 'search_used' });
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map((t) => {
            const on = filters.has(t);
            return (
              <button
                key={t}
                onClick={() => {
                  setFilters((prev) => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t);
                    else next.add(t);
                    return next;
                  });
                  void trackComensalEvent({
                    tableId,
                    event: 'filter_used',
                    data: { tag: t, action: on ? 'remove' : 'add' },
                  });
                }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  on
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {DIETARY_TAG_LABELS[t]}
              </button>
            );
          })}
          {filters.size > 0 && (
            <button
              onClick={() => setFilters(new Set())}
              className="text-xs text-muted-foreground underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Listado */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24">
        {filteredItems.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay platos que coincidan. Probá quitando filtros o cambiando la búsqueda.
            </p>
          </div>
        ) : (
          categories.map((cat) => {
            const inCat = itemsByCategory.get(cat.id) ?? [];
            if (inCat.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="space-y-3 py-4">
                <h2 className="text-lg font-semibold">{cat.name}</h2>
                <div className="grid grid-cols-1 gap-3">
                  {inCat.map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      onClick={() => {
                        setSelected(it);
                        void trackComensalEvent({
                          tableId,
                          event: 'item_view',
                          data: { item_id: it.id },
                        });
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
        {(itemsByCategory.get('__none__') ?? []).length > 0 && (
          <section className="space-y-3 py-4">
            <h2 className="text-lg font-semibold">Otros</h2>
            <div className="grid grid-cols-1 gap-3">
              {itemsByCategory.get('__none__')?.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  onClick={() => {
                    setSelected(it);
                    void trackComensalEvent({
                      tableId,
                      event: 'item_view',
                      data: { item_id: it.id },
                    });
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button
            disabled
            className="flex-1"
            style={brandColor ? { backgroundColor: brandColor, color: 'white' } : undefined}
          >
            Llamar al mesero (próximamente)
          </Button>
        </div>
      </footer>

      {selected && (
        <ItemDetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          brandColor={brandColor}
        />
      )}
    </div>
  );
}

function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-muted">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
            sin foto
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="leading-tight font-medium">{item.name}</span>
          <span className="shrink-0 text-sm font-semibold">
            ${Number(item.price).toLocaleString('es-CO')}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        {(item.dietary_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(item.dietary_tags as DietaryTag[]).slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {DIETARY_TAG_LABELS[t] ?? t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
