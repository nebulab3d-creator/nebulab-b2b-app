import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Range = 'today' | 'week' | 'month';

function sinceFor(range: Range): string {
  const now = new Date();
  const d = new Date(now);
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(now.getDate() - 7);
  else d.setDate(now.getDate() - 30);
  return d.toISOString();
}

function csvEscape(v: string | number | null): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const me = await requireTenantUser();
  const range = (req.nextUrl.searchParams.get('range') ?? 'today') as Range;
  const since = sinceFor(range);

  const supabase = createClient();

  // Build the query with all filters
  let query = supabase
    .from('waiter_calls')
    .select('id, table_id, status, reason, created_at, acknowledged_at, resolved_at')
    .gte('created_at', since);

  // Apply table filter
  const tableFilter = req.nextUrl.searchParams.get('table');
  if (tableFilter) {
    query = query.eq('table_id', tableFilter);
  }

  // Apply reason filter
  const reasonFilter = req.nextUrl.searchParams.get('reason');
  if (reasonFilter) {
    const reasons = reasonFilter.split(',').filter(Boolean);
    if (reasons.length > 0) {
      query = query.in('reason', reasons);
    }
  }

  // Apply status filter
  const statusFilter = req.nextUrl.searchParams.get('status');
  if (statusFilter) {
    const statuses = statusFilter.split(',').filter(Boolean);
    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }
  }

  const { data: calls } = await query.order('created_at', { ascending: false }).limit(5000);

  // Fetch tables separately for mapping
  const { data: tables } = await supabase.from('tables').select('id, number');
  const tableNumber = new Map<string, string>();
  for (const t of tables ?? []) tableNumber.set(t.id, String(t.number));

  const lines: string[] = [];
  lines.push('Mesa,Razón,Estado,Respuesta (minutos),Resolución (minutos),Fecha y hora');

  const fmtMinutes = (ms: number): string => {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60_000)} min`;
  };

  for (const call of calls ?? []) {
    const ackMs = call.acknowledged_at
      ? new Date(call.acknowledged_at).getTime() - new Date(call.created_at).getTime()
      : null;
    const resMs = call.resolved_at
      ? new Date(call.resolved_at).getTime() - new Date(call.created_at).getTime()
      : null;

    const tableNum = tableNumber.get(call.table_id) ?? '?';
    const statusLabel =
      call.status === 'pending'
        ? 'Pendiente'
        : call.status === 'acknowledged'
          ? 'Atendida'
          : 'Resuelta';

    lines.push(
      [
        csvEscape(`Mesa ${tableNum}`),
        csvEscape(call.reason ?? ''),
        csvEscape(statusLabel),
        csvEscape(ackMs === null ? '' : fmtMinutes(ackMs)),
        csvEscape(resMs === null ? '' : fmtMinutes(resMs)),
        csvEscape(new Date(call.created_at).toLocaleString('es-CO')),
      ].join(','),
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${me.tenant.slug}-llamadas-${range}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
