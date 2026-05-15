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
import { createAdminClient } from '@/lib/supabase/admin';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'secondary',
  cancelled: 'destructive',
};

export default async function TenantsListPage() {
  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, slug, name, plan, status, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {tenants?.length ?? 0} restaurante{(tenants?.length ?? 0) === 1 ? '' : 's'} en la
            plataforma
          </p>
        </div>
        <Link href="/super/tenants/new">
          <Button>+ Nuevo tenant</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tenants ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay tenants. Creá el primero.
                </TableCell>
              </TableRow>
            )}
            {(tenants ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.slug}</TableCell>
                <TableCell>{t.plan}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'}>{t.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString('es-CO')}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/super/tenants/${t.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver
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
