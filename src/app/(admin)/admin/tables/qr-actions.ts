'use server';

import { revalidatePath } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { generateQrCode } from '@/lib/qr/links';
import { createClient } from '@/lib/supabase/server';
import { qrLinkIdSchema, updateQrLinkSchema } from '@/lib/validations/qr-links';

import type { ActionResult } from './actions';

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

/** Edita el destino (override URL) y el estado activo de un QR dinámico. */
export async function updateQrLinkAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = updateQrLinkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const targetUrl = parsed.data.target_url?.trim();
  const supabase = createClient();
  const { data, error } = await supabase
    .from('qr_links')
    .update({ target_url: targetUrl ? targetUrl : null, active: parsed.data.active })
    .eq('id', parsed.data.id)
    .eq('tenant_id', me.tenant.id)
    .select('table_id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/tables');
  if (data?.table_id) revalidatePath(`/admin/tables/${data.table_id}`);
  return { ok: true, message: 'Destino del QR actualizado' };
}

/** Genera un código nuevo para el QR (invalida el QR ya impreso). */
export async function regenerateQrCodeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']);
  const parsed = qrLinkIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'ID inválido' };

  const supabase = createClient();
  // Reintenta ante colisión improbable de `code`.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('qr_links')
      .update({ code: generateQrCode() })
      .eq('id', parsed.data.id)
      .eq('tenant_id', me.tenant.id)
      .select('table_id')
      .maybeSingle();
    if (!error) {
      revalidatePath('/admin/tables');
      if (data?.table_id) revalidatePath(`/admin/tables/${data.table_id}`);
      return { ok: true, message: 'Código regenerado — reimprimí el QR' };
    }
    if (error.code !== '23505') return { ok: false, error: error.message };
  }
  return { ok: false, error: 'No se pudo generar un código único, intentá de nuevo' };
}
