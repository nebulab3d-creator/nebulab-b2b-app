'use client';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import type { Json } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';
import { DIETARY_TAG_LABELS, type DietaryTag, type MenuTemplate } from '@/lib/validations/menu';

export interface ComensalItem {
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

export function ItemsGrid({
  template,
  children,
}: {
  template: MenuTemplate;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid gap-3',
        template === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        template === 'compact' && 'gap-1',
      )}
    >
      {children}
    </div>
  );
}

export function ItemCard({
  item,
  template,
  onClick,
}: {
  item: ComensalItem;
  template: MenuTemplate;
  onClick: () => void;
}) {
  const showImage = template !== 'compact';
  const imageSize = template === 'grid' ? 'h-16 w-16' : 'h-20 w-20';
  const padding = template === 'compact' ? 'p-2' : 'p-3';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex gap-3 rounded-lg border bg-card text-left transition-colors hover:bg-muted/30',
        padding,
      )}
    >
      {showImage && (
        <div className={cn('relative shrink-0 overflow-hidden rounded bg-muted', imageSize)}>
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes={template === 'grid' ? '64px' : '80px'}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
              sin foto
            </div>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="leading-tight font-medium">{item.name}</span>
          <span className="shrink-0 text-sm font-semibold">
            ${Number(item.price).toLocaleString('es-CO')}
          </span>
        </div>
        {item.description && template !== 'compact' && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        {item.description && template === 'compact' && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
        )}
        {(item.dietary_tags ?? []).length > 0 && template !== 'compact' && (
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
