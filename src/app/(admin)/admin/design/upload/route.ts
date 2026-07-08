import { randomBytes } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'menu-images';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // límite del bucket
const MAX_GIF_BYTES = 4 * 1024 * 1024; // presupuesto 4G para animaciones (RNF-9)
const QUOTA_BYTES = 200 * 1024 * 1024; // 200MB por tenant (RNF-11, plan base)

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/**
 * Upload de media del editor de diseño (RNF-11).
 * El cliente ya redimensiona/convierte a WebP las imágenes raster; acá se
 * valida MIME/tamaño, se aplica la quota del tenant y se sube con service role
 * (el bucket no tiene policies de escritura para authenticated).
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.kind !== 'tenant') {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (me.role !== 'owner' && me.role !== 'manager') {
    return NextResponse.json({ error: 'Solo owner o manager puede subir media' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Formato no soportado: ${file.type}. Usá JPG/PNG/WebP/GIF.` },
      { status: 400 },
    );
  }
  const max = file.type === 'image/gif' ? MAX_GIF_BYTES : MAX_BYTES;
  if (file.size > max) {
    return NextResponse.json(
      { error: `El archivo supera ${Math.round(max / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }

  const admin = createAdminClient();

  // Quota por tenant (RNF-11).
  const { data: used, error: quotaError } = await admin.rpc('tenant_storage_bytes', {
    p_tenant_id: me.tenant.id,
  });
  if (quotaError) {
    return NextResponse.json({ error: quotaError.message }, { status: 500 });
  }
  if ((used ?? 0) + file.size > QUOTA_BYTES) {
    const usedMb = Math.round((used ?? 0) / 1024 / 1024);
    return NextResponse.json(
      {
        error: `Espacio insuficiente: usás ${usedMb}MB de ${QUOTA_BYTES / 1024 / 1024}MB. Borrá imágenes que no uses.`,
      },
      { status: 413 },
    );
  }

  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const path = `${me.tenant.id}/design/${randomBytes(8).toString('hex')}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
