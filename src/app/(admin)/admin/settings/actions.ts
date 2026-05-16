'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateTenantSettingsSchema } from '@/lib/validations/menu';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

/**
 * Owner edita branding/settings de su tenant.
 * RLS de `tenants` solo permite UPDATE a super_admin → usamos service_role
 * después de validar que el caller es owner del tenant.
 */
export async function updateTenantSettingsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const me = await requireTenantUser(['owner']);
  const parsed = updateTenantSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const settings = {
    ...(typeof me.tenant.settings === 'object' && me.tenant.settings !== null
      ? me.tenant.settings
      : {}),
    brand_color: parsed.data.brand_color || null,
    logo_url: parsed.data.logo_url || null,
    welcome_message: parsed.data.welcome_message || null,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ name: parsed.data.name, settings })
    .eq('id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  revalidateTag(`tenant-menu:${me.tenant.id}`);
  revalidateTag(`tenant-info:${me.tenant.slug}`);
  return { ok: true, message: 'Configuración guardada' };
}
