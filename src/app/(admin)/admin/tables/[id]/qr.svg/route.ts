import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { tableQrSvgString } from '@/lib/qr/generate';
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

  const svg = await tableQrSvgString(me.tenant.slug, t.id);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="mesa-${t.number}.svg"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
