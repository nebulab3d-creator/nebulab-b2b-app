import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { qrSvgString } from '@/lib/qr/generate';
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
  const svg = await qrSvgString(url);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="mesa-${t.number}.svg"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
