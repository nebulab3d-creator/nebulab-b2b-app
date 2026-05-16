import 'server-only';

import { randomBytes } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'menu-images';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult = { ok: true; publicUrl: string } | { ok: false; error: string };

/**
 * Sube una imagen al bucket `menu-images` y devuelve la URL pública.
 * Path: <tenant_id>/<item_id>/<random>.<ext>
 *
 * NO valida que el `item_id` exista — la ruta se asume controlada por el caller.
 */
export async function uploadMenuImage(
  file: File,
  tenantId: string,
  itemId: string,
): Promise<UploadResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: `Formato no soportado: ${file.type}. Usá JPG/PNG/WebP/AVIF.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Imagen supera 5MB.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const random = randomBytes(6).toString('hex');
  const path = `${tenantId}/${itemId}/${random}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl };
}

/**
 * Borra una imagen del bucket dado su public URL.
 * No falla si el archivo no existe (idempotente).
 */
export async function deleteMenuImage(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  const match = publicUrl.match(/\/menu-images\/(.+?)(?:\?|$)/);
  if (!match) return;
  const path = match[1]!;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
