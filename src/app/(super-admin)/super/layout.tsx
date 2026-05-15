import { redirect } from 'next/navigation';

import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  if (!me) redirect('/login');
  if (me.kind !== 'super') redirect('/admin');

  return (
    <PostHogProvider
      init={{
        distinctId: me.auth.id,
        tenantId: null,
        tenantName: null,
        role: 'super_admin',
        email: me.auth.email,
      }}
    >
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-amber-300 bg-amber-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Nebulab3D · Super-admin</span>
            <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
              INTERNAL
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{me.auth.email}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </PostHogProvider>
  );
}
