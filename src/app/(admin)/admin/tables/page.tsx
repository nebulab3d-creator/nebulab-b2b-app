import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

export default async function TablesPage() {
  const me = await requireTenantUser();
  const supabase = createClient();
  const { data: tables } = await supabase
    .from('tables')
    .select('id, number, active, created_at')
    .order('number', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            {tables?.length ?? 0} mesa{(tables?.length ?? 0) === 1 ? '' : 's'} · {me.tenant.name}
          </p>
        </div>
        {(me.role === 'owner' || me.role === 'manager') && (
          <div className="flex gap-2">
            <a
              href="/admin/tables/qr-bulk"
              className="text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener"
            >
              Descargar todos los QR (ZIP)
            </a>
            <Link href="/admin/tables/new">
              <Button>+ Nueva mesa</Button>
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>QR</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tables ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No hay mesas. Creá la primera para generar su QR.
                </TableCell>
              </TableRow>
            )}
            {(tables ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.number}</TableCell>
                <TableCell>
                  <Badge variant={t.active ? 'default' : 'secondary'}>
                    {t.active ? 'activa' : 'inactiva'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <a
                    href={`/admin/tables/${t.id}/qr.png`}
                    download={`mesa-${t.number}.png`}
                    className="text-sm text-primary hover:underline"
                  >
                    PNG
                  </a>
                  {' · '}
                  <a
                    href={`/admin/tables/${t.id}/qr.svg`}
                    download={`mesa-${t.number}.svg`}
                    className="text-sm text-primary hover:underline"
                  >
                    SVG
                  </a>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/tables/${t.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver / editar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
