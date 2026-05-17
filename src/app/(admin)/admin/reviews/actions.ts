'use server';

import { revalidatePath } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { markRedeemedSchema } from '@/lib/validations/reviews';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

export async function setRedeemedAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = markRedeemedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = createClient();
  const { error } = await supabase
    .from('reviews')
    .update({ redeemed_at: parsed.data.redeemed ? new Date().toISOString() : null })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/reviews');
  return { ok: true };
}
