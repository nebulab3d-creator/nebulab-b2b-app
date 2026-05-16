import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { tableQrSvgDataUrl, tableUrl } from '@/lib/qr/generate';
import { createClient } from '@/lib/supabase/server';

import { EditTableForm } from './edit-table-form';

export default async function TableDetailPage({ params }: { params: { id: string } }) {
  const me = await requireTenantUser();
  const supabase = createClient();
  const { data: t } = await supabase
    .from('tables')
    .select('id, number, active, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!t) notFound();

  const url = tableUrl(me.tenant.slug, t.id);
  const qrDataUrl = await tableQrSvgDataUrl(me.tenant.slug, t.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/tables" className="text-xs text-muted-foreground hover:underline">
        ← Mesas
      </Link>
      <h1 className="text-2xl font-bold">Mesa {t.number}</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SVG inline data URL — Next/Image no aplica a data: URLs */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR mesa ${t.number}`}
              className="aspect-square w-full rounded border bg-white p-2"
            />
            <div className="space-y-1 text-xs break-all text-muted-foreground">{url}</div>
            <div className="flex gap-3 text-sm">
              <a
                href={`/admin/tables/${t.id}/qr.png`}
                download={`mesa-${t.number}.png`}
                className="text-primary hover:underline"
              >
                Descargar PNG
              </a>
              <a
                href={`/admin/tables/${t.id}/qr.svg`}
                download={`mesa-${t.number}.svg`}
                className="text-primary hover:underline"
              >
                Descargar SVG
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editar</CardTitle>
          </CardHeader>
          <CardContent>
            {me.role === 'owner' || me.role === 'manager' ? (
              <EditTableForm tableId={t.id} initialNumber={t.number} initialActive={t.active} />
            ) : (
              <p className="text-sm text-muted-foreground">Solo owner o manager puede editar.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
