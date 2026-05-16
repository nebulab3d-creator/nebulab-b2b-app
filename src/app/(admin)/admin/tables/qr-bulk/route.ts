import JSZip from 'jszip';
import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { tableQrPngBuffer } from '@/lib/qr/generate';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  const me = await requireTenantUser();
  const supabase = createClient();
  const { data: tables } = await supabase
    .from('tables')
    .select('id, number')
    .eq('active', true)
    .order('number', { ascending: true });

  if (!tables || tables.length === 0) {
    return new Response('No hay mesas activas', { status: 404 });
  }

  const zip = new JSZip();
  for (const t of tables) {
    const png = await tableQrPngBuffer(me.tenant.slug, t.id);
    zip.file(`mesa-${t.number}.png`, png);
  }
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zipBuf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${me.tenant.slug}-qr-${date}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
