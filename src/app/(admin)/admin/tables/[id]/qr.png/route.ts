import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { qrPngBuffer } from '@/lib/qr/generate';
import { ensureTableQrUrl } from '@/lib/qr/links';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireTenantUser();
  const supabase = createClient();
  const { data: t } = await supabase
    .from('tables')
    .select('id, number')
    .eq('id', params.id)
    .maybeSingle();
  if (!t) return new Response('Not found', { status: 404 });

  const url = await ensureTableQrUrl(supabase, me.tenant.id, me.tenant.slug, t.id);
  const png = await qrPngBuffer(url);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="mesa-${t.number}.png"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
