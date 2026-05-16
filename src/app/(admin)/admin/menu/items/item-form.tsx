'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import {
  createItemAction,
  deleteItemAction,
  updateItemAction,
  type ActionResult,
} from '@/app/(admin)/admin/menu/items/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DIETARY_TAG_LABELS, DIETARY_TAGS, type DietaryTag } from '@/lib/validations/menu';

interface CategoryOpt {
  id: string;
  name: string;
}

interface Initial {
  id?: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  dietary_tags: DietaryTag[];
  macros: { calories?: number; protein?: number; carbs?: number; fat?: number };
  available: boolean;
  position: number;
  image_url: string | null;
}

export function ItemForm({
  mode,
  categories,
  initial,
}: {
  mode: 'create' | 'edit';
  categories: CategoryOpt[];
  initial: Initial;
}) {
  const router = useRouter();
  const action = mode === 'create' ? createItemAction : updateItemAction;
  const [state, dispatch] = useFormState<ActionResult, FormData>(action, null);
  const [delState, delDispatch] = useFormState<ActionResult, FormData>(deleteItemAction, null);
  const [removeImg, setRemoveImg] = useState(false);

  useEffect(() => {
    if (state?.ok === true) {
      toast.success(state.message ?? 'Listo');
      if (mode === 'create') router.push('/admin/menu/items');
    }
    if (state?.ok === false) toast.error(state.error);
  }, [state, mode, router]);

  useEffect(() => {
    if (delState?.ok === true) {
      toast.success(delState.message ?? 'Borrado');
      router.push('/admin/menu/items');
    }
    if (delState?.ok === false) toast.error(delState.error);
  }, [delState, router]);

  return (
    <div className="space-y-6">
      <form action={dispatch} encType="multipart/form-data" className="space-y-6">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}

        {/* Básicos */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initial.name}
              required
              maxLength={120}
              placeholder="Hamburguesa clásica"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={initial.description}
              rows={3}
              maxLength={2000}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (COP)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="100"
                min={0}
                defaultValue={initial.price}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Orden</Label>
              <Input
                id="position"
                name="position"
                type="number"
                min={0}
                defaultValue={initial.position}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={initial.category_id ?? ''}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">— sin categoría —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Imagen */}
        <section className="space-y-2">
          <Label htmlFor="image">Imagen del plato (opcional)</Label>
          {initial.image_url && !removeImg && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initial.image_url}
                alt="actual"
                className="h-32 w-32 rounded bg-muted object-cover"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  name="remove_image"
                  value="true"
                  onChange={(e) => setRemoveImg(e.target.checked)}
                />
                Borrar imagen actual
              </label>
            </div>
          )}
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
          />
          <p className="text-xs text-muted-foreground">JPG/PNG/WebP/AVIF, max 5MB.</p>
        </section>

        {/* Ingredientes y tags */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredientes</Label>
            <textarea
              id="ingredients"
              name="ingredients"
              defaultValue={initial.ingredients.join('\n')}
              rows={4}
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              placeholder="Uno por línea (o separados por coma)"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tags dietéticos</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIETARY_TAGS.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="dietary_tags"
                    value={t}
                    defaultChecked={initial.dietary_tags.includes(t)}
                  />
                  {DIETARY_TAG_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        {/* Macros */}
        <section className="space-y-2">
          <Label>Macros (opcional)</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              name="macros.calories"
              type="number"
              min={0}
              placeholder="Cal"
              defaultValue={initial.macros.calories ?? ''}
            />
            <Input
              name="macros.protein"
              type="number"
              min={0}
              step="0.1"
              placeholder="Prot (g)"
              defaultValue={initial.macros.protein ?? ''}
            />
            <Input
              name="macros.carbs"
              type="number"
              min={0}
              step="0.1"
              placeholder="Carb (g)"
              defaultValue={initial.macros.carbs ?? ''}
            />
            <Input
              name="macros.fat"
              type="number"
              min={0}
              step="0.1"
              placeholder="Grasa (g)"
              defaultValue={initial.macros.fat ?? ''}
            />
          </div>
        </section>

        {/* Disponibilidad */}
        <section>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="available"
              defaultChecked={initial.available}
              value="true"
            />
            Disponible (visible para el comensal)
          </label>
        </section>

        {state?.ok === false && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
          <SubmitButton label={mode === 'create' ? 'Crear plato' : 'Guardar'} />
        </div>
      </form>

      {mode === 'edit' && initial.id && (
        <form
          action={delDispatch}
          onSubmit={(e) => {
            if (!window.confirm('¿Borrar plato? Acción irreversible.')) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={initial.id} />
          <Button type="submit" variant="destructive" size="sm">
            Borrar plato
          </Button>
        </form>
      )}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? '…' : label}
    </Button>
  );
}
