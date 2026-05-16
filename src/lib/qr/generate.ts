import 'server-only';

import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function tableUrl(slug: string, tableId: string): string {
  return `${APP_URL}/r/${slug}/t/${tableId}`;
}

const baseOpts = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export async function tableQrPngBuffer(slug: string, tableId: string): Promise<Buffer> {
  const url = tableUrl(slug, tableId);
  return await QRCode.toBuffer(url, { ...baseOpts, type: 'png', width: 600 });
}

export async function tableQrSvgString(slug: string, tableId: string): Promise<string> {
  const url = tableUrl(slug, tableId);
  return await QRCode.toString(url, { ...baseOpts, type: 'svg', width: 600 });
}

/** Data URL embebible directamente en <img src> para preview en panel admin. */
export async function tableQrSvgDataUrl(slug: string, tableId: string): Promise<string> {
  const svg = await tableQrSvgString(slug, tableId);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
