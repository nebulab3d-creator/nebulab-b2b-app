import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/get-current-user';

import { ChangePasswordForm } from './change-password-form';

export default async function ChangePasswordPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login');
  // Si no es tenant user O ya cambió el password, no hay nada que hacer aquí.
  if (me.kind === 'super') redirect('/super');
  if (!me.profile.must_change_password) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <ChangePasswordForm />
    </div>
  );
}
