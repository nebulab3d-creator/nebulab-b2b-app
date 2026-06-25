import 'server-only';

import { headers } from 'next/headers';
import QRCode from 'qrcode';

/**
 * Base URL para construir las URLs de los QR.
 *
 * Prioriza el host REAL de la request (x-forwarded-host / host) para que el QR
 * siempre apunte al dominio desde el que se está sirviendo el panel — así no
 * depende de que `NEXT_PUBLIC_APP_URL` esté bien configurada en cada ambiente
 * (era la causa del placeholder `<tu-proyecto>.vercel.app`). Fuera de un request
 * scope cae al env var y, en último caso, a localhost.
 */
export function getBaseUrl(): string {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // headers() no está disponible fuera de un request scope.
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/** URL corta del QR dinámico: /q/<code> (resuelta server-side a su destino). */
export function qrLinkUrl(code: string): string {
  return `${getBaseUrl()}/q/${code}`;
}

/** URL directa al menú del comensal (fallback si una mesa no tuviera qr_link). */
export function tableUrl(slug: string, tableId: string): string {
  return `${getBaseUrl()}/r/${slug}/t/${tableId}`;
}

const baseOpts = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export async function qrPngBuffer(url: string): Promise<Buffer> {
  return await QRCode.toBuffer(url, { ...baseOpts, type: 'png', width: 600 });
}

export async function qrSvgString(url: string): Promise<string> {
  return await QRCode.toString(url, { ...baseOpts, type: 'svg', width: 600 });
}

/** Data URL embebible directamente en <img src> para preview en panel admin. */
export async function qrSvgDataUrl(url: string): Promise<string> {
  const svg = await qrSvgString(url);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
