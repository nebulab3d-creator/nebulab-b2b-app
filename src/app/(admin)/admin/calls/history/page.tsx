import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
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

type Range = 'today' | 'week' | 'month';

function sinceFor(range: Range): string {
  const now = new Date();
  const d = new Date(now);
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(now.getDate() - 7);
  else d.setDate(now.getDate() - 30);
  return d.toISOString();
}

function fmtMinutes(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)} min`;
}

export default async function CallsHistoryPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  await requireTenantUser();
  const range: Range =
    searchParams.range === 'week' || searchParams.range === 'month' ? searchParams.range : 'today';
  const since = sinceFor(range);

  const supabase = createClient();
  const [{ data: calls }, { data: tables }] = await Promise.all([
    supabase
      .from('waiter_calls')
      .select('id, table_id, status, reason, created_at, acknowledged_at, resolved_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('tables').select('id, number'),
  ]);

  const tableNumber = new Map<string, string>();
  for (const t of tables ?? []) tableNumber.set(t.id, t.number);

  // Métricas
  const acknowledgedTimes: number[] = [];
  const resolvedTimes: number[] = [];
  const byTable = new Map<string, number>();
  for (const c of calls ?? []) {
    if (c.acknowledged_at) {
      acknowledgedTimes.push(
        new Date(c.acknowledged_at).getTime() - new Date(c.created_at).getTime(),
      );
    }
    if (c.resolved_at) {
      resolvedTimes.push(new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime());
    }
    byTable.set(c.table_id, (byTable.get(c.table_id) ?? 0) + 1);
  }
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

  const topTables = [...byTable.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/calls" className="text-xs text-muted-foreground hover:underline">
            ← Llamadas activas
          </Link>
          <h1 className="text-2xl font-bold">Histórico de llamadas</h1>
        </div>
        <nav className="flex gap-1 text-sm">
          {(['today', 'week', 'month'] as const).map((r) => (
            <Link
              key={r}
              href={`/admin/calls/history?range=${r}`}
              className={`rounded-full px-3 py-1 ${
                range === r ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
              }`}
            >
              {r === 'today' ? 'Hoy' : r === 'week' ? '7 días' : '30 días'}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total llamadas" value={String(calls?.length ?? 0)} />
        <Stat
          label="Tiempo prom. respuesta"
          value={acknowledgedTimes.length > 0 ? fmtMinutes(avg(acknowledgedTimes)) : '—'}
        />
        <Stat
          label="Tiempo prom. resolución"
          value={resolvedTimes.length > 0 ? fmtMinutes(avg(resolvedTimes)) : '—'}
        />
        <Stat
          label="Mesa más activa"
          value={topTables[0] ? `Mesa ${tableNumber.get(topTables[0][0]) ?? '?'}` : '—'}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mesa</TableHead>
              <TableHead>Razón</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Respuesta</TableHead>
              <TableHead>Resolución</TableHead>
              <TableHead>Cuándo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(calls ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin llamadas en este rango.
                </TableCell>
              </TableRow>
            )}
            {(calls ?? []).map((c) => {
              const ackMs = c.acknowledged_at
                ? new Date(c.acknowledged_at).getTime() - new Date(c.created_at).getTime()
                : null;
              const resMs = c.resolved_at
                ? new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()
                : null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    Mesa {tableNumber.get(c.table_id) ?? '?'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.reason ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 'resolved'
                          ? 'outline'
                          : c.status === 'acknowledged'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ackMs === null ? '—' : fmtMinutes(ackMs)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {resMs === null ? '—' : fmtMinutes(resMs)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString('es-CO')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
