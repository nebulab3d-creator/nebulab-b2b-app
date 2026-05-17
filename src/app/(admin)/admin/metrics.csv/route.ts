import { type NextRequest } from 'next/server';

import { requireTenantUser } from '@/lib/auth/require-tenant';
import { fetchDashboard, type DashboardRange } from '@/lib/metrics/dashboard';

export const dynamic = 'force-dynamic';

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const me = await requireTenantUser();
  const range = (req.nextUrl.searchParams.get('range') ?? 'today') as DashboardRange;
  const data = await fetchDashboard(range === 'week' || range === 'month' ? range : 'today');

  const lines: string[] = [];
  lines.push('section,key,value');
  lines.push(`summary,total_scans,${data.totalScans}`);
  lines.push(`summary,item_views,${data.itemViews}`);
  lines.push(`summary,filter_usage,${data.filterUsage}`);
  lines.push(`summary,total_calls,${data.totalCalls}`);
  lines.push(`summary,total_reviews,${data.totalReviews}`);
  lines.push(`summary,avg_rating,${data.avgRating.toFixed(2)}`);
  lines.push('');
  lines.push('top_items,name,views');
  for (const it of data.topItems) {
    lines.push(`top_items,${csvEscape(it.name)},${it.views}`);
  }
  lines.push('');
  lines.push('top_tables,table,events');
  for (const t of data.topTables) {
    lines.push(`top_tables,${csvEscape(`Mesa ${t.number}`)},${t.events}`);
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${me.tenant.slug}-metrics-${range}-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
