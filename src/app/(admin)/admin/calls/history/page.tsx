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

import { HistoryFilters } from './history-filters';

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
  searchParams: {
    range?: string;
    table?: string;
    reason?: string | string[];
    status?: string | string[];
  };
}) {
  await requireTenantUser();
  const range: Range =
    searchParams.range === 'week' || searchParams.range === 'month' ? searchParams.range : 'today';
  const since = sinceFor(range);

  const supabase = createClient();

  // Build the base query
  let query = supabase
    .from('waiter_calls')
    .select('id, table_id, status, reason, created_at, acknowledged_at, resolved_at')
    .gte('created_at', since);

  // Apply table filter
  if (searchParams.table) {
    query = query.eq('table_id', searchParams.table);
  }

  // Apply reason filter (handle both single and multiple values)
  const reasons = Array.isArray(searchParams.reason)
    ? searchParams.reason
    : searchParams.reason
      ? [searchParams.reason]
      : [];
  if (reasons.length > 0) {
    query = query.in('reason', reasons);
  }

  // Apply status filter (handle both single and multiple values)
  const statuses = Array.isArray(searchParams.status)
    ? searchParams.status
    : searchParams.status
      ? [searchParams.status]
      : [];
  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }

  type WaiterCallRecord = {
    id: string;
    table_id: string;
    status: string;
    reason: string | null;
    created_at: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
  };

  const fetchCalls = async () => {
    const result = await query.order('created_at', { ascending: false }).limit(500);
    return result as { data: WaiterCallRecord[] | null; error: unknown };
  };

  const [callsResult, { data: tables }] = await Promise.all([
    fetchCalls(),
    supabase.from('tables').select('id, number'),
  ]);

  const calls = callsResult.data;

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

  const csvParams = new URLSearchParams({
    range,
    ...(searchParams.table && { table: searchParams.table }),
    ...(reasons.length > 0 && { reason: reasons.join(',') }),
    ...(statuses.length > 0 && { status: statuses.join(',') }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link href="/admin/calls" className="text-xs text-muted-foreground hover:underline">
            ← Llamadas activas
          </Link>
          <h1 className="text-2xl font-bold">Histórico de llamadas</h1>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 text-sm">
            {(['today', 'week', 'month'] as const).map((r) => {
              const url = new URLSearchParams();
              for (const [k, v] of Object.entries(searchParams)) {
                if (k !== 'range') {
                  const vals = Array.isArray(v) ? v : [v];
                  for (const val of vals) {
                    url.append(k, val);
                  }
                }
              }
              url.set('range', r);
              return (
                <Link
                  key={r}
                  href={`/admin/calls/history?${url.toString()}`}
                  className={`rounded-full px-3 py-1 ${
                    range === r ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r === 'today' ? 'Hoy' : r === 'week' ? '7 días' : '30 días'}
                </Link>
              );
            })}
          </nav>
          <Link
            href={`/admin/calls/history/csv?${csvParams.toString()}`}
            download
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Descargar CSV
          </Link>
        </div>
      </div>

      <HistoryFilters />

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
              const tableNum = tableNumber.get(c.table_id) ?? '?';
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">Mesa {tableNum}</TableCell>
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
                      {c.status === 'pending'
                        ? 'Pendiente'
                        : c.status === 'acknowledged'
                          ? 'Atendida'
                          : 'Resuelta'}
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
