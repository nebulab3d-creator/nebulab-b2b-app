import Link from 'next/link';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

import { CallsDashboard } from './calls-dashboard';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const me = await requireTenantUser();
  const supabase = createClient();

  const [{ data: activeCalls }, { data: tables }] = await Promise.all([
    supabase
      .from('waiter_calls')
      .select('id, table_id, status, reason, created_at, acknowledged_at')
      .in('status', ['pending', 'acknowledged'])
      .order('created_at', { ascending: true }),
    supabase.from('tables').select('id, number'),
  ]);

  const tableNumber = new Map<string, string>();
  for (const t of tables ?? []) tableNumber.set(t.id, t.number);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Llamadas activas</h1>
          <p className="text-sm text-muted-foreground">Realtime · si suena, alguien te llama</p>
        </div>
        <Link href="/admin/calls/history" className="text-sm text-primary hover:underline">
          Histórico →
        </Link>
      </div>
      <CallsDashboard
        tenantId={me.tenant.id}
        initialCalls={(activeCalls ?? []) as never}
        tableNumbers={Object.fromEntries(tableNumber)}
      />
    </div>
  );
}
