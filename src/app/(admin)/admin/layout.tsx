import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  if (!me) redirect('/login');
  if (me.kind === 'super') redirect('/super');
  if (me.profile.must_change_password) redirect('/change-password');

  return (
    <PostHogProvider
      init={{
        distinctId: me.auth.id,
        tenantId: me.tenant.id,
        tenantName: me.tenant.name,
        role: me.role,
        email: me.auth.email,
      }}
    >
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{me.tenant.name}</span>
            <span className="text-sm text-muted-foreground">· Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {me.profile.full_name}{' '}
              <span className="text-xs text-muted-foreground">({me.role})</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <div className="flex flex-1">
          <aside className="w-56 border-r p-4 text-sm text-muted-foreground">
            <nav className="space-y-1">
              <SidebarLink href="/admin" label="Dashboard" />
              <SidebarLink href="/admin/menu" label="Menú" />
              <SidebarLink href="/admin/tables" label="Mesas" />
              <SidebarLink href="/admin/calls" label="Llamadas" />
              <SidebarItem label="Reseñas" disabled />
              <SidebarItem label="Métricas" disabled />
              {me.role === 'owner' && (
                <>
                  <SidebarLink href="/admin/settings" label="Configuración" />
                  <SidebarItem label="Usuarios" disabled />
                </>
              )}
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </PostHogProvider>
  );
}

function SidebarItem({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <div
      className={`rounded-md px-3 py-2 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'}`}
    >
      {label}
      {disabled && <span className="ml-2 text-xs">(próximamente)</span>}
    </div>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
    >
      {label}
    </Link>
  );
}
