'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { deleteMenuImage, uploadMenuImage } from '@/lib/storage/menu-images';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { createItemBaseSchema, reorderSchema, updateItemSchema } from '@/lib/validations/menu';

type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update'];

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');
const tag = (tenantId: string) => `tenant-menu:${tenantId}`;

/** Construye un objeto plano de FormData soportando multi-value (dietary_tags). */
function formToObject(fd: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of fd.entries()) {
    if (key === 'image' || key === 'image_url' || key === 'remove_image') continue;
    if (key in out) {
      const cur = out[key];
      out[key] = Array.isArray(cur) ? [...cur, value] : [cur as FormDataEntryValue, value];
    } else {
      out[key] = value;
    }
  }
  // Normalizar JSON de macros (vienen como campos planos, los empaquetamos)
  const macros = {
    calories: fd.get('macros.calories') || undefined,
    protein: fd.get('macros.protein') || undefined,
    carbs: fd.get('macros.carbs') || undefined,
    fat: fd.get('macros.fat') || undefined,
  };
  out['macros'] = macros as unknown as FormDataEntryValue;
  // category_id vacío → null
  if (out['category_id'] === '') out['category_id'] = null as unknown as FormDataEntryValue;
  return out;
}

export async function createItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = createItemBaseSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { data: created, error } = await supabase
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
    .select('id')
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? 'Error' };

  // Si vino imagen, subirla y actualizar image_url
  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const up = await uploadMenuImage(file, me.tenant.id, created.id);
    if (up.ok) {
      await supabase.from('menu_items').update({ image_url: up.publicUrl }).eq('id', created.id);
    } else {
      // No abortamos el create si falla solo la imagen; el owner puede reintentar editando
      return { ok: true, message: `Plato creado, pero la imagen falló: ${up.error}` };
    }
  }

  revalidatePath('/admin/menu');
  revalidatePath('/admin/menu/items');
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Plato creado' };
}

export async function updateItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = updateItemSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  // Leer item para tener URL anterior y poder borrarla si se reemplaza
  const { data: prev } = await supabase
    .from('menu_items')
    .select('image_url')
    .eq('id', parsed.data.id)
    .maybeSingle();

  const update: MenuItemUpdate = {
    category_id: parsed.data.category_id ?? null,
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    ingredients: parsed.data.ingredients,
    dietary_tags: parsed.data.dietary_tags,
    macros: parsed.data.macros,
    available: parsed.data.available,
    position: parsed.data.position,
  };

  const removeImage = formData.get('remove_image') === 'true';
  const file = formData.get('image');

  if (removeImage) {
    update.image_url = null;
  }

  let newImageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const up = await uploadMenuImage(file, me.tenant.id, parsed.data.id);
    if (!up.ok) return { ok: false, error: up.error };
    newImageUrl = up.publicUrl;
    update.image_url = up.publicUrl;
  }

  const { error } = await supabase
    .from('menu_items')
    .update(update)
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  // Cleanup imagen vieja si fue reemplazada o removida
  if ((removeImage || newImageUrl) && prev?.image_url && prev.image_url !== newImageUrl) {
    await deleteMenuImage(prev.image_url);
  }

  revalidatePath('/admin/menu');
  revalidatePath('/admin/menu/items');
  revalidatePath(`/admin/menu/items/${parsed.data.id}`);
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Plato actualizado' };
}

export async function deleteItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const id = formData.get('id');
  if (typeof id !== 'string') return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { data: prev } = await supabase
    .from('menu_items')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  if (prev?.image_url) await deleteMenuImage(prev.image_url);

  revalidatePath('/admin/menu');
  revalidatePath('/admin/menu/items');
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Plato borrado' };
}

export async function toggleItemAvailabilityAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const id = formData.get('id');
  if (typeof id !== 'string') return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { data: cur } = await supabase
    .from('menu_items')
    .select('available')
    .eq('id', id)
    .maybeSingle();
  if (!cur) return { ok: false, error: 'No encontrado' };

  await supabase
    .from('menu_items')
    .update({ available: !cur.available })
    .eq('id', id)
    .eq('tenant_id', me.tenant.id);

  revalidatePath('/admin/menu');
  revalidatePath('/admin/menu/items');
  revalidateTag(tag(me.tenant.id));
  return { ok: true };
}

export async function reorderItemAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = reorderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = createClient();
  // Obtener category del item para reordenar dentro de su misma categoría
  const { data: target } = await supabase
    .from('menu_items')
    .select('id, category_id, position')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (!target) return { ok: false, error: 'No encontrado' };

  let q = supabase.from('menu_items').select('id, position');
  if (target.category_id) q = q.eq('category_id', target.category_id);
  else q = q.is('category_id', null);

  const { data: rows } = await q.order('position', { ascending: true });
  if (!rows) return { ok: false, error: 'Sin datos' };

  const idx = rows.findIndex((r) => r.id === target.id);
  const swapWith = parsed.data.direction === 'up' ? rows[idx - 1] : rows[idx + 1];
  if (!swapWith) return { ok: true };

  const me_row = rows[idx]!;
  await supabase
    .from('menu_items')
    .update({ position: swapWith.position })
    .eq('id', me_row.id)
    .eq('tenant_id', me.tenant.id);
  await supabase
    .from('menu_items')
    .update({ position: me_row.position })
    .eq('id', swapWith.id)
    .eq('tenant_id', me.tenant.id);

  revalidatePath('/admin/menu');
  revalidatePath('/admin/menu/items');
  revalidateTag(tag(me.tenant.id));
  return { ok: true };
}
