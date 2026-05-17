import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { fetchDashboard, type DashboardRange } from '@/lib/metrics/dashboard';

export const dynamic = 'force-dynamic';

const RANGE_LABEL: Record<DashboardRange, string> = {
  today: 'Hoy',
  week: '7 días',
  month: '30 días',
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const me = await getCurrentUser();
  if (!me || me.kind !== 'tenant') return null;

  const range: DashboardRange =
    searchParams.range === 'week' || searchParams.range === 'month' ? searchParams.range : 'today';
  const data = await fetchDashboard(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bienvenido, {me.profile.full_name.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Panel de {me.tenant.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex gap-1 text-sm">
            {(['today', 'week', 'month'] as const).map((r) => (
              <Link
                key={r}
                href={`/admin?range=${r}`}
                className={`rounded-full px-3 py-1 ${
                  range === r ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}
              >
                {RANGE_LABEL[r]}
              </Link>
            ))}
          </nav>
          <a
            href={`/admin/metrics.csv?range=${range}`}
            className="text-sm text-primary hover:underline"
            download
          >
            CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Escaneos QR" value={String(data.totalScans)} />
        <Stat label="Vistas de plato" value={String(data.itemViews)} />
        <Stat label="Filtros usados" value={String(data.filterUsage)} />
        <Stat label="Llamadas mesero" value={String(data.totalCalls)} />
        <Stat label="Reseñas" value={String(data.totalReviews)} />
        <Stat
          label="Rating prom."
          value={data.totalReviews === 0 ? '—' : data.avgRating.toFixed(1)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title={`Top 10 platos más vistos (${RANGE_LABEL[range]})`}>
          {data.topItems.length === 0 ? (
            <Empty msg="Sin vistas en este rango" />
          ) : (
            <BarList
              items={data.topItems.map((i) => ({
                label: i.name,
                value: i.views,
              }))}
            />
          )}
        </Panel>
        <Panel title={`Mesas más activas (${RANGE_LABEL[range]})`}>
          {data.topTables.length === 0 ? (
            <Empty msg="Sin actividad en este rango" />
          ) : (
            <BarList
              items={data.topTables.map((t) => ({
                label: `Mesa ${t.number}`,
                value: t.events,
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground">{msg}</p>;
}

function BarList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => (
        <li key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate pr-3">{it.label}</span>
            <span className="text-muted-foreground tabular-nums">{it.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-muted">
            <div className="h-full bg-foreground" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
