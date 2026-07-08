'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { createCategorySchema, createItemBaseSchema } from '@/lib/validations/menu';

/**
 * Gestión rápida del menú desde el editor de diseño (llamada directa, no form).
 * Permite crear categorías y platos sin salir de /admin/design, para poder
 * armar un diseño publicable (necesita ≥1 categoría) en un solo lugar.
 */

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

export type CreateCategoryResult =
  | { ok: true; category: { id: string; name: string } }
  | { ok: false; error: string };

export async function createCategoryForDesignAction(
  name: string,
  position: number,
): Promise<CreateCategoryResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = createCategorySchema.safeParse({ name, position });
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ tenant_id: me.tenant.id, name: parsed.data.name, position: parsed.data.position })
    .select('id, name')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidateTag(`tenant-menu:${me.tenant.id}`);
  revalidateTag(`tenant-menu-by-slug:${me.tenant.slug}`);
  return { ok: true, category: data };
}

export interface QuickDishRow {
  id: string;
  name: string;
  category_id: string | null;
  image_url: string | null;
}

export type CreateDishResult = { ok: true; dish: QuickDishRow } | { ok: false; error: string };

export async function createDishForDesignAction(
  categoryId: string,
  name: string,
  price: number,
): Promise<CreateDishResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = createItemBaseSchema.safeParse({ category_id: categoryId, name, price });
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      tenant_id: me.tenant.id,
      category_id: parsed.data.category_id ?? null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price: parsed.data.price,
      ingredients: parsed.data.ingredients,
      dietary_tags: parsed.data.dietary_tags,
      macros: parsed.data.macros,
      available: parsed.data.available,
      position: parsed.data.position,
    })
    .select('id, name, category_id, image_url')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidateTag(`tenant-menu:${me.tenant.id}`);
  revalidateTag(`tenant-menu-by-slug:${me.tenant.slug}`);
  return { ok: true, dish: data };
}

export type SetDishImageResult = { ok: true } | { ok: false; error: string };

/** Asigna (o quita, con cadena vacía) la foto de un plato desde el editor. */
export async function setDishImageForDesignAction(
  itemId: string,
  imageUrl: string,
): Promise<SetDishImageResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  if (!z.string().uuid().safeParse(itemId).success) {
    return { ok: false, error: 'Plato inválido' };
  }
  const trimmed = imageUrl.trim();
  if (trimmed && !z.string().url().max(2048).safeParse(trimmed).success) {
    return { ok: false, error: 'URL de imagen inválida' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('menu_items')
    .update({ image_url: trimmed || null })
    .eq('id', itemId)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidateTag(`tenant-menu:${me.tenant.id}`);
  revalidateTag(`tenant-menu-by-slug:${me.tenant.slug}`);
  return { ok: true };
}
