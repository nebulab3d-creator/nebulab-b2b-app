'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { createTableSchema, tableIdSchema, updateTableSchema } from '@/lib/validations/tables';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

export async function createTableAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = createTableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.from('tables').insert({
    tenant_id: me.tenant.id,
    number: parsed.data.number,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'Ya existe una mesa con ese número' : error.message,
    };
  }

  revalidatePath('/admin/tables');
  revalidateTag(`tenant-tables:${me.tenant.id}`);
  return { ok: true, message: 'Mesa creada' };
}

export async function updateTableAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = updateTableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase
    .from('tables')
    .update({ number: parsed.data.number, active: parsed.data.active })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/tables');
  revalidatePath(`/admin/tables/${parsed.data.id}`);
  revalidateTag(`tenant-tables:${me.tenant.id}`);
  return { ok: true, message: 'Mesa actualizada' };
}

export async function deleteTableAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = tableIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/tables');
  revalidateTag(`tenant-tables:${me.tenant.id}`);
  return { ok: true, message: 'Mesa borrada' };
}
