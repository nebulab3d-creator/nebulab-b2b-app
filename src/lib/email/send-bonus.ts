import 'server-only';

import { Resend } from 'resend';

import { logger } from '@/lib/logger';

let cachedResend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedResend) cachedResend = new Resend(key);
  return cachedResend;
}

const FROM = process.env.RESEND_FROM ?? 'Nebulab3D <onboarding@resend.dev>';

interface BonusEmailInput {
  to: string;
  tenantName: string;
  bonusCode: string;
  bonusCopy: string;
  conditions: string;
  expiryDays: number;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: 'no_key' | 'send_failed'; error?: string };

/**
 * Envía email de bonificación al comensal. No-op si RESEND_API_KEY no está
 * configurada — devuelve { ok: false, reason: 'no_key' } para que el caller
 * decida (típicamente: igual mostrar el código en pantalla).
 */
export async function sendBonusEmail(input: BonusEmailInput): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    logger.warn(
      { to: input.to, bonusCode: input.bonusCode },
      'RESEND_API_KEY no configurada — skipping email',
    );
    return { ok: false, reason: 'no_key' };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: `Tu bonificación de ${input.tenantName}`,
      html: renderBonusHtml(input),
    });
    if (error) {
      logger.error({ to: input.to, err: error }, 'Resend send failed');
      return { ok: false, reason: 'send_failed', error: String(error) };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ to: input.to, err: msg }, 'Resend threw');
    return { ok: false, reason: 'send_failed', error: msg };
  }
}

function renderBonusHtml(i: BonusEmailInput): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:22px;margin:0 0 8px">Gracias por tu reseña 🙌</h1>
  <p style="color:#555">De parte de <strong>${escape(i.tenantName)}</strong>:</p>
  <p style="font-size:16px;margin:16px 0">${escape(i.bonusCopy)}</p>
  <div style="background:#f4f4f5;border:1px dashed #999;padding:16px;text-align:center;border-radius:8px;margin:16px 0">
    <div style="font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.05em">Tu código</div>
    <div style="font-size:28px;font-family:ui-monospace,Menlo,monospace;letter-spacing:.1em;margin-top:6px">${escape(i.bonusCode)}</div>
  </div>
  ${i.conditions ? `<p style="font-size:13px;color:#666">${escape(i.conditions)}</p>` : ''}
  <p style="font-size:13px;color:#666">Válido por ${i.expiryDays} días desde hoy.</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0" />
  <p style="font-size:11px;color:#999">Enviado por Nebulab3D en nombre de ${escape(i.tenantName)}.</p>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
