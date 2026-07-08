'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ImageUploadField } from './image-upload-field';
import {
  createCategoryForDesignAction,
  createDishForDesignAction,
  setDishImageForDesignAction,
  type QuickDishRow,
} from './menu-actions';

export interface QuickCategory {
  id: string;
  name: string;
}

export type QuickDish = QuickDishRow;

/**
 * Gestión rápida del menú dentro del editor de diseño: crear categorías, platos
 * y asignar fotos a los platos sin salir de /admin/design.
 */
export function MenuQuickPanel({
  categories,
  dishes,
  onCategoryCreated,
  onDishCreated,
  onDishImageChanged,
  disabled,
}: {
  categories: QuickCategory[];
  dishes: QuickDish[];
  /** El editor agrega la categoría al estado y crea un bloque para ella. */
  onCategoryCreated: (cat: QuickCategory) => void;
  /** El editor agrega el plato al estado y recarga el preview. */
  onDishCreated: (dish: QuickDish) => void;
  /** El editor actualiza la foto del plato en el estado y recarga el preview. */
  onDishImageChanged: (itemId: string, imageUrl: string | null) => void;
  disabled: boolean;
}) {
  const [newCategory, setNewCategory] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  async function createCategory() {
    const name = newCategory.trim();
    if (name.length < 2) {
      toast.error('El nombre de la categoría necesita al menos 2 caracteres');
      return;
    }
    setCreatingCat(true);
    try {
      const r = await createCategoryForDesignAction(name, categories.length);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onCategoryCreated(r.category);
      setNewCategory('');
      toast.success(`Categoría "${r.category.name}" creada y agregada al diseño`);
    } finally {
      setCreatingCat(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Creá categorías, platos y subí la foto de cada plato acá mismo. Las categorías se agregan
        como bloque al diseño.
      </p>

      {categories.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Todavía no tenés categorías. Creá la primera para poder publicar el diseño.
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              dishes={dishes.filter((d) => d.category_id === c.id)}
              onDishCreated={onDishCreated}
              onDishImageChanged={onDishImageChanged}
              disabled={disabled}
            />
          ))}
        </ul>
      )}

      <div className="space-y-1">
        <Label htmlFor="new-category" className="text-xs">
          Nueva categoría
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="new-category"
            value={newCategory}
            disabled={disabled || creatingCat}
            placeholder="Ej: Postres"
            maxLength={60}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createCategory();
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => void createCategory()}
            disabled={disabled || creatingCat}
          >
            {creatingCat ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  dishes,
  onDishCreated,
  onDishImageChanged,
  disabled,
}: {
  category: QuickCategory;
  dishes: QuickDish[];
  onDishCreated: (dish: QuickDish) => void;
  onDishImageChanged: (itemId: string, imageUrl: string | null) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  async function addDish() {
    const dishName = name.trim();
    if (dishName.length < 2) {
      toast.error('El nombre del plato necesita al menos 2 caracteres');
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error('Precio inválido');
      return;
    }
    setSaving(true);
    try {
      const r = await createDishForDesignAction(category.id, dishName, priceNum);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setName('');
      setPrice('');
      onDishCreated(r.dish);
      toast.success(`Plato "${dishName}" agregado a ${category.name}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-2 rounded-md border p-2">
      <div className="text-sm font-medium">{category.name}</div>

      {dishes.length > 0 && (
        <ul className="space-y-1.5">
          {dishes.map((d) => (
            <DishRow key={d.id} dish={d} onImageChanged={onDishImageChanged} disabled={disabled} />
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={name}
          disabled={disabled || saving}
          placeholder="Nuevo plato"
          maxLength={120}
          className="flex-1"
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          value={price}
          disabled={disabled || saving}
          placeholder="Precio"
          inputMode="numeric"
          className="w-24"
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addDish();
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void addDish()}
          disabled={disabled || saving}
        >
          {saving ? '…' : 'Agregar'}
        </Button>
      </div>
    </li>
  );
}

function DishRow({
  dish,
  onImageChanged,
  disabled,
}: {
  dish: QuickDish;
  onImageChanged: (itemId: string, imageUrl: string | null) => void;
  disabled: boolean;
}) {
  const [removing, setRemoving] = useState(false);

  async function persist(url: string) {
    const r = await setDishImageForDesignAction(dish.id, url);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    onImageChanged(dish.id, url || null);
    toast.success(url ? `Foto de "${dish.name}" actualizada` : `Foto de "${dish.name}" quitada`);
  }

  return (
    <li className="flex items-center gap-2 rounded border bg-card px-2 py-1.5">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
        {dish.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] text-muted-foreground">
            sin foto
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-xs">{dish.name}</span>
      <ImageUploadField
        buttonLabel={dish.image_url ? 'Cambiar foto' : 'Subir foto'}
        onUploaded={(url) => void persist(url)}
      />
      {dish.image_url && (
        <button
          type="button"
          disabled={disabled || removing}
          className="text-[11px] text-muted-foreground underline disabled:opacity-50"
          onClick={async () => {
            setRemoving(true);
            try {
              await persist('');
            } finally {
              setRemoving(false);
            }
          }}
        >
          Quitar
        </button>
      )}
    </li>
  );
}
