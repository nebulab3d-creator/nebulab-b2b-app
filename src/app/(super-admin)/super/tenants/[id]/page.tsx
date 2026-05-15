import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAdminClient } from '@/lib/supabase/admin';

import { TenantActions } from './tenant-actions';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'secondary',
  cancelled: 'destructive',
};

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slug, name, plan, status, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, email, role, must_change_password, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/super/tenants" className="text-xs text-muted-foreground hover:underline">
            ← Tenants
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{tenant.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{tenant.slug}</p>
        </div>
        <Badge variant={STATUS_VARIANT[tenant.status] ?? 'outline'}>{tenant.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Plan" value={tenant.plan} />
          <Row label="Slug" value={tenant.slug} mono />
          <Row label="Creado" value={new Date(tenant.created_at).toLocaleString('es-CO')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({users?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Pwd temporal?</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.must_change_password ? '⚠ pendiente' : 'cambiada'}
                  </TableCell>
                  <TableCell>
                    <TenantActions.ResetPassword userId={u.id} email={u.email} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantActions.StatusButtons tenantId={tenant.id} currentStatus={tenant.status} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
    </div>
  );
}
