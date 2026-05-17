'use server';

import { sendBonusEmail } from '@/lib/email/send-bonus';
import { generateBonusCode } from '@/lib/reviews/bonus-code';
import { createAdminClient } from '@/lib/supabase/admin';
import { bonificationSettingsSchema, createReviewSchema, isEmail } from '@/lib/validations/reviews';

export type SubmitReviewResult =
  | {
      ok: true;
      isPublic: boolean;
      bonusCode: string | null;
      bonusCopy: string | null;
      googleReviewUrl: string | null;
      emailSent: boolean;
    }
  | { ok: false; error: string };

const ANTI_FRAUD_DAYS = 30;

/**
 * Crea reseña (anon flow vía service_role para poder hacer anti-fraude check
 * y emitir bonus code en el mismo request).
 *
 * Trigger en DB setea `tenant_id` desde `table_id` e `is_public` desde rating.
 * Acá agregamos: bonus code + email + URL Google review.
 */
export async function submitReviewAction(
  _prev: SubmitReviewResult | null,
  formData: FormData,
): Promise<SubmitReviewResult> {
  const parsed = createReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(' · ') };
  }
  const input = parsed.data;

  const admin = createAdminClient();

  // 1. Resolver tenant_id desde table_id (defensa: el trigger lo va a hacer también)
  const { data: table } = await admin
    .from('tables')
    .select('id, tenant_id, active')
    .eq('id', input.table_id)
    .maybeSingle();
  if (!table || !table.active) return { ok: false, error: 'Mesa inválida' };

  // 2. Anti-fraude: ¿este contacto ya tuvo bonus en últimos N días?
  const since = new Date();
  since.setDate(since.getDate() - ANTI_FRAUD_DAYS);
  const { data: existing } = await admin
    .from('reviews')
    .select('id, bonus_sent')
    .eq('tenant_id', table.tenant_id)
    .eq('customer_contact', input.customer_contact)
    .gte('created_at', since.toISOString())
    .eq('bonus_sent', true)
    .limit(1);
  const alreadyBonused = (existing?.length ?? 0) > 0;

  // 3. Leer settings del tenant (bonificación + place_id)
  const { data: tenant } = await admin
    .from('tenants')
    .select('name, settings')
    .eq('id', table.tenant_id)
    .single();
  if (!tenant) return { ok: false, error: 'Tenant no encontrado' };

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const bonificationParsed = bonificationSettingsSchema.safeParse(settings.bonification);
  const bonification = bonificationParsed.success ? bonificationParsed.data : null;

  const shouldEmitBonus = bonification !== null && !alreadyBonused;
  const bonusCode = shouldEmitBonus ? generateBonusCode() : null;

  // 4. Insert review (trigger setea tenant_id e is_public)
  const { data: review, error: insErr } = await admin
    .from('reviews')
    .insert({
      tenant_id: table.tenant_id, // trigger lo va a sobreescribir igual
      table_id: input.table_id,
      rating: input.rating,
      comment: input.comment || null,
      customer_name: input.customer_name || null,
      customer_contact: input.customer_contact,
      bonus_code: bonusCode,
    } as never)
    .select('id, is_public')
    .single();
  if (insErr || !review) return { ok: false, error: insErr?.message ?? 'No se pudo guardar' };

  // 5. Si se emite bonus: enviar email (si es email) y marcar bonus_sent
  let emailSent = false;
  if (bonusCode && bonification) {
    if (isEmail(input.customer_contact)) {
      const result = await sendBonusEmail({
        to: input.customer_contact,
        tenantName: tenant.name,
        bonusCode,
        bonusCopy: bonification.copy,
        conditions: bonification.conditions ?? '',
        expiryDays: bonification.expiry_days,
      });
      emailSent = result.ok;
    }
    await admin.from('reviews').update({ bonus_sent: true }).eq('id', review.id);
  }

  // 6. Google review URL si is_public + place_id configurado
  const placeId =
    typeof settings.google_place_id === 'string' && settings.google_place_id.length > 0
      ? settings.google_place_id
      : null;
  const googleReviewUrl =
    review.is_public && placeId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
      : null;

  return {
    ok: true,
    isPublic: review.is_public,
    bonusCode,
    bonusCopy: bonification?.copy ?? null,
    googleReviewUrl,
    emailSent,
  };
}
