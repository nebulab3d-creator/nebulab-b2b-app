import 'server-only';

import { createClient } from '@/lib/supabase/server';

export type DashboardRange = 'today' | 'week' | 'month';

export function sinceFor(range: DashboardRange): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(now.getDate() - 7);
  else d.setDate(now.getDate() - 30);
  return d;
}

export interface DashboardData {
  totalScans: number;
  itemViews: number;
  filterUsage: number;
  totalCalls: number;
  totalReviews: number;
  avgRating: number;
  topItems: Array<{ item_id: string; name: string; views: number }>;
  topTables: Array<{ table_id: string; number: string; events: number }>;
}

export async function fetchDashboard(range: DashboardRange): Promise<DashboardData> {
  const supabase = createClient();
  const since = sinceFor(range).toISOString();

  const [
    { data: events },
    { count: callsCount },
    { data: reviewsAgg },
    { data: tables },
    { data: items },
  ] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('event_type, event_data, table_id, created_at')
      .gte('created_at', since)
      .limit(20_000),
    supabase
      .from('waiter_calls')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase.from('reviews').select('rating').gte('created_at', since),
    supabase.from('tables').select('id, number'),
    supabase.from('menu_items').select('id, name'),
  ]);

  const eventList = events ?? [];

  let totalScans = 0;
  let itemViews = 0;
  let filterUsage = 0;
  const itemCounts = new Map<string, number>();
  const tableCounts = new Map<string, number>();

  for (const ev of eventList) {
    if (ev.event_type === 'qr_scan') totalScans++;
    else if (ev.event_type === 'item_view') {
      itemViews++;
      const data = (ev.event_data as { item_id?: string } | null) ?? null;
      if (data?.item_id) {
        itemCounts.set(data.item_id, (itemCounts.get(data.item_id) ?? 0) + 1);
      }
    } else if (ev.event_type === 'filter_used') filterUsage++;
    if (ev.table_id) {
      tableCounts.set(ev.table_id, (tableCounts.get(ev.table_id) ?? 0) + 1);
    }
  }

  const itemName = new Map<string, string>();
  for (const it of items ?? []) itemName.set(it.id, it.name);
  const tableNumber = new Map<string, string>();
  for (const t of tables ?? []) tableNumber.set(t.id, t.number);

  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([item_id, views]) => ({
      item_id,
      name: itemName.get(item_id) ?? '(borrado)',
      views,
    }));

  const topTables = [...tableCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([table_id, events]) => ({
      table_id,
      number: tableNumber.get(table_id) ?? '?',
      events,
    }));

  const ratings = (reviewsAgg ?? [])
    .map((r) => r.rating)
    .filter((n): n is number => typeof n === 'number');
  const avgRating = ratings.length === 0 ? 0 : ratings.reduce((s, v) => s + v, 0) / ratings.length;

  return {
    totalScans,
    itemViews,
    filterUsage,
    totalCalls: callsCount ?? 0,
    totalReviews: ratings.length,
    avgRating,
    topItems,
    topTables,
  };
}
