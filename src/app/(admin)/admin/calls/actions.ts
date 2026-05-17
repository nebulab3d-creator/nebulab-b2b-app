'use server';

import { revalidatePath } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { callIdSchema } from '@/lib/validations/waiter-calls';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

export async function acknowledgeCallAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser();
  const parsed = callIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { error } = await supabase
    .from('waiter_calls')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/calls');
  return { ok: true };
}

export async function resolveCallAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser();
  const parsed = callIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  const { error } = await supabase
    .from('waiter_calls')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: me.auth.id,
    })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/calls');
  revalidatePath('/admin/calls/history');
  return { ok: true };
}
