'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertSuperAdmin } from '@/lib/super-admin/auth-guard';
import { generateTempPassword } from '@/lib/super-admin/passwords';
import { provisionTenant, type ProvisionResult } from '@/lib/super-admin/provision';
import {
  createTenantWithOwnerSchema,
  resetOwnerPasswordSchema,
  setTenantStatusSchema,
  updateTenantSchema,
} from '@/lib/validations/super-admin';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

function flatten(issues: { message: string }[]): string {
  return issues.map((i) => i.message).join(' · ');
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE TENANT + OWNER (devuelve temp password — la UI lo muestra una sola vez)
// ────────────────────────────────────────────────────────────────────────────

export async function createTenantWithOwnerAction(
  _prev: ProvisionResult | null,
  formData: FormData,
): Promise<ProvisionResult> {
  await assertSuperAdmin();

  const parsed = createTenantWithOwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();
  const result = await provisionTenant(admin, parsed.data, tempPassword);

  if (result.ok) revalidatePath('/super/tenants');
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// UPDATE TENANT (slug, name, plan)
// ────────────────────────────────────────────────────────────────────────────

export async function updateTenantAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await assertSuperAdmin();
  const parsed = updateTenantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ slug: parsed.data.slug, name: parsed.data.name, plan: parsed.data.plan })
    .eq('id', parsed.data.id);
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'Ese slug ya existe' : (error.message ?? 'Error'),
    };
  }
  revalidatePath('/super/tenants');
  revalidatePath(`/super/tenants/${parsed.data.id}`);
  return { ok: true, message: 'Tenant actualizado' };
}

// ────────────────────────────────────────────────────────────────────────────
// SET STATUS (active / suspended / cancelled)
// ────────────────────────────────────────────────────────────────────────────

export async function setTenantStatusAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await assertSuperAdmin();
  const parsed = setTenantStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/super/tenants');
  revalidatePath(`/super/tenants/${parsed.data.id}`);
  return { ok: true, message: `Estado: ${parsed.data.status}` };
}

// ────────────────────────────────────────────────────────────────────────────
// RESET OWNER PASSWORD (manda email de reset al owner)
// ────────────────────────────────────────────────────────────────────────────

export async function resetOwnerPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await assertSuperAdmin();
  const parsed = resetOwnerPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { error } = await admin.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: `Email de reset enviado a ${parsed.data.email}` };
}

// ────────────────────────────────────────────────────────────────────────────
// REDIRECT helper para usar desde forms server-action
// ────────────────────────────────────────────────────────────────────────────

export async function goToTenantDetail(tenantId: string): Promise<void> {
  redirect(`/super/tenants/${tenantId}`);
}
