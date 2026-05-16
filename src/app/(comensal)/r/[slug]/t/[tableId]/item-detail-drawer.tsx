'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Json } from '@/lib/supabase/database.types';
import { DIETARY_TAG_LABELS, type DietaryTag } from '@/lib/validations/menu';

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  ingredients: string[];
  dietary_tags: string[];
  macros: Json | null;
}

export function ItemDetailDrawer({
  item,
  onClose,
  brandColor,
}: {
  item: Item;
  onClose: () => void;
  brandColor: string | null;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const macros =
    typeof item.macros === 'object' && item.macros !== null
      ? (item.macros as Record<string, number | undefined>)
      : {};
  const hasMacros = ['calories', 'protein', 'carbs', 'fat'].some(
    (k) => typeof macros[k] === 'number',
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${item.name}`}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {item.image_url && (
          <div className="relative aspect-video w-full bg-muted">
            <Image src={item.image_url} alt={item.name} fill priority className="object-cover" />
          </div>
        )}
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <span className="text-lg font-bold">${Number(item.price).toLocaleString('es-CO')}</span>
          </div>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          {(item.dietary_tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(item.dietary_tags as DietaryTag[]).map((t) => (
                <Badge key={t} variant="secondary">
                  {DIETARY_TAG_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          )}
          {(item.ingredients ?? []).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Ingredientes</h3>
              <p className="text-sm text-muted-foreground">{item.ingredients.join(' · ')}</p>
            </div>
          )}
          {hasMacros && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Información nutricional</h3>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <Macro label="Cal" value={macros.calories} />
                <Macro label="Prot" value={macros.protein} unit="g" />
                <Macro label="Carb" value={macros.carbs} unit="g" />
                <Macro label="Grasa" value={macros.fat} unit="g" />
              </div>
            </div>
          )}
          <Button
            type="button"
            onClick={onClose}
            className="w-full"
            style={brandColor ? { backgroundColor: brandColor, color: 'white' } : undefined}
          >
            Volver al menú
          </Button>
        </div>
      </div>
    </div>
  );
}

function Macro({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | undefined;
  unit?: string;
}) {
  return (
    <div className="rounded border p-2">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-sm font-semibold">
        {typeof value === 'number' ? `${value}${unit ?? ''}` : '—'}
      </div>
    </div>
  );
}
