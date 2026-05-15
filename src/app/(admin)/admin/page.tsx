import { getCurrentUser } from '@/lib/auth/get-current-user';

export default async function AdminDashboardPage() {
  const me = await getCurrentUser();
  // El layout ya garantiza kind='tenant', pero el narrowing es por request.
  if (!me || me.kind !== 'tenant') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido, {me.profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Panel de {me.tenant.name}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Escaneos hoy" value="—" />
        <Stat label="Llamadas activas" value="—" />
        <Stat label="Reseñas (7d)" value="—" />
        <Stat label="Platos activos" value="—" />
      </div>
      <p className="text-sm text-muted-foreground">Las métricas se conectan en próximos sprints.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
