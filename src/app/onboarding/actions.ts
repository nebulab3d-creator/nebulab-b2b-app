'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import { updateTenantSettingsSchema } from '@/lib/validations/menu';
import { bonificationSettingsSchema, updateReviewSettingsSchema } from '@/lib/validations/reviews';
import { createTableSchema } from '@/lib/validations/tables';

export type ActionState = { ok: false; error: string } | { ok: true } | null;

const flatten = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' · ');

function mergeSettings(current: unknown, patch: Record<string, Json | undefined>): Json {
  const base =
    typeof current === 'object' && current !== null && !Array.isArray(current)
      ? (current as { [k: string]: Json | undefined })
      : {};
  return { ...base, ...patch };
}

// ── Paso 1: Branding ──────────────────────────────────────────────────

export async function submitBrandingStep(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireTenantUser(['owner']);
  // Onboarding solo pide este subset de settings; el resto se configura después.
  const parsed = updateTenantSettingsSchema
    .pick({ name: true, brand_color: true, logo_url: true, welcome_message: true })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const settings = mergeSettings(me.tenant.settings, {
    brand_color: parsed.data.brand_color || null,
    logo_url: parsed.data.logo_url || null,
    welcome_message: parsed.data.welcome_message || null,
  });
  const admin = createAdminClient();
  const { error } = await admin
    .from('tenants')
    .update({ name: parsed.data.name, settings })
    .eq('id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  redirect('/onboarding/reviews');
}

// ── Paso 2: Bonificación + threshold + place_id ───────────────────────

export async function submitReviewsStep(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireTenantUser(['owner']);

  const fd = Object.fromEntries(formData);
  // El form combina ambos schemas
  const reviewParsed = updateReviewSettingsSchema.safeParse(fd);
  if (!reviewParsed.success) return { ok: false, error: flatten(reviewParsed.error.issues) };

  // La bonificación es opcional en el wizard — si `bonification_skip=true` salta
  const skipBonus = fd.bonification_skip === 'true';
  let bonifPatch: Record<string, Json | undefined> = {};
  if (!skipBonus) {
    const b = bonificationSettingsSchema.safeParse(fd);
    if (!b.success) return { ok: false, error: flatten(b.error.issues) };
    bonifPatch = { bonification: b.data };
  }

  const settings = mergeSettings(me.tenant.settings, {
    google_place_id: reviewParsed.data.google_place_id || null,
    review_public_threshold: reviewParsed.data.review_public_threshold,
    ...bonifPatch,
  });

  const admin = createAdminClient();
  const { error } = await admin.from('tenants').update({ settings }).eq('id', me.tenant.id);
  if (error) return { ok: false, error: error.message };

  redirect('/onboarding/first-table');
}

// ── Paso 3: Primera mesa + marcar onboarded ──────────────────────────

export async function submitFirstTableStep(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireTenantUser(['owner']);
  const parsed = createTableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flatten(parsed.error.issues) };

  const admin = createAdminClient();

  const { error: tErr } = await admin
    .from('tables')
    .insert({ tenant_id: me.tenant.id, number: parsed.data.number });
  if (tErr && tErr.code !== '23505') {
    // 23505 = ya existe una mesa con ese número (caso de reintento del wizard)
    return { ok: false, error: tErr.message };
  }

  const settings = mergeSettings(me.tenant.settings, {
    onboarded_at: new Date().toISOString(),
  });
  const { error: uErr } = await admin.from('tenants').update({ settings }).eq('id', me.tenant.id);
  if (uErr) return { ok: false, error: uErr.message };

  revalidatePath('/admin');
  revalidateTag(`tenant-menu:${me.tenant.id}`);
  redirect('/admin');
}
