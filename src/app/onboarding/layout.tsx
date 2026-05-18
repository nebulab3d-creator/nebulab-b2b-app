import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { ONBOARDING_STEPS, STEP_LABELS, readOnboardedAt } from '@/lib/auth/onboarding';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  if (me.kind === 'super') redirect('/super');
  if (me.profile.must_change_password) redirect('/change-password');
  if (readOnboardedAt(me.tenant.settings)) redirect('/admin');

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-3">
          <div>
            <Link href="/" className="text-base font-semibold">
              Nebulab3D
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">Configuración inicial</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {me.tenant.name} · {me.profile.full_name}
          </span>
        </div>
        <ol className="flex w-full justify-between border-t bg-muted/40 px-6 py-2 text-xs">
          {ONBOARDING_STEPS.map((s, i) => (
            <li key={s} className="flex-1 truncate text-center text-muted-foreground">
              <span className="mr-1 inline-block size-5 rounded-full bg-foreground/10 text-center leading-5 font-medium">
                {i + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
