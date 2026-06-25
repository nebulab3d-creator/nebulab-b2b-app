import 'server-only';

import { randomBytes } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

import { qrLinkUrl, tableUrl } from './generate';

type Client = SupabaseClient<Database>;

/** Código corto url-safe (base64url, 12 chars). */
export function generateQrCode(): string {
  return randomBytes(12).toString('base64url').slice(0, 12);
}

/**
 * Inserta un qr_link para una mesa generando un código único, reintentando ante
 * colisión de `code` (violación de UNIQUE, 23505). Requiere rol owner|manager
 * (lo aplica RLS). Devuelve el código creado o null si no se pudo (p.ej. RLS).
 */
export async function insertTableQrLink(
  supabase: Client,
  tenantId: string,
  tableId: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateQrCode();
    const { error } = await supabase
      .from('qr_links')
      .insert({ tenant_id: tenantId, table_id: tableId, code });
    if (!error) return code;
    if (error.code !== '23505') return null; // error real (RLS, etc.)
    // 23505 puede ser colisión de code (reintentar) o de table_id (ya existe link)
    const existing = await getTableQrCode(supabase, tableId);
    if (existing) return existing;
  }
  return null;
}

/** Devuelve el código del qr_link "home" de una mesa, o null si no tiene. */
export async function getTableQrCode(supabase: Client, tableId: string): Promise<string | null> {
  const { data } = await supabase
    .from('qr_links')
    .select('code')
    .eq('table_id', tableId)
    .maybeSingle();
  return data?.code ?? null;
}

/**
 * Garantiza que la mesa tenga un qr_link y devuelve la URL corta a codificar en
 * el QR. Si no existe link e intentar crearlo falla (p.ej. staff sin permiso de
 * INSERT), cae a la URL directa /r/<slug>/t/<tableId> para no romper el QR.
 */
export async function ensureTableQrUrl(
  supabase: Client,
  tenantId: string,
  slug: string,
  tableId: string,
): Promise<string> {
  const existing = await getTableQrCode(supabase, tableId);
  const code = existing ?? (await insertTableQrLink(supabase, tenantId, tableId));
  return code ? qrLinkUrl(code) : tableUrl(slug, tableId);
}
