'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { createCategorySchema, reorderSchema, updateCategorySchema } from '@/lib/validations/menu';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

const tag = (tenantId: string) => `tenant-menu:${tenantId}`;

export async function createCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = createCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.from('menu_categories').insert({
    tenant_id: me.tenant.id,
    name: parsed.data.name,
    position: parsed.data.position,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Categoría creada' };
}

export async function updateCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = updateCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase
    .from('menu_categories')
    .update({
      name: parsed.data.name,
      position: parsed.data.position,
      active: parsed.data.active,
    })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidatePath(`/admin/menu/categories/${parsed.data.id}`);
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Categoría actualizada' };
}

export async function deleteCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const id = formData.get('id');
  if (typeof id !== 'string') return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/menu');
  revalidateTag(tag(me.tenant.id));
  return { ok: true, message: 'Categoría borrada (los items quedan sin categoría)' };
}

/**
 * Reordena una categoría intercambiando su `position` con la del vecino
 * inmediato hacia arriba o abajo. Implementación simple, sin index gaps.
 */
export async function reorderCategoryAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = reorderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = createClient();
  const { data: rows } = await supabase
    .from('menu_categories')
    .select('id, position')
    .order('position', { ascending: true });
  if (!rows) return { ok: false, error: 'Sin datos' };

  const idx = rows.findIndex((r) => r.id === parsed.data.id);
  if (idx === -1) return { ok: false, error: 'No encontrada' };
  const swapWith = parsed.data.direction === 'up' ? rows[idx - 1] : rows[idx + 1];
  if (!swapWith) return { ok: true }; // ya estaba en el extremo

  const me_row = rows[idx]!;
  await supabase
    .from('menu_categories')
    .update({ position: swapWith.position })
    .eq('id', me_row.id)
    .eq('tenant_id', me.tenant.id);
  await supabase
    .from('menu_categories')
    .update({ position: me_row.position })
    .eq('id', swapWith.id)
    .eq('tenant_id', me.tenant.id);

  revalidatePath('/admin/menu');
  revalidateTag(tag(me.tenant.id));
  return { ok: true };
}
