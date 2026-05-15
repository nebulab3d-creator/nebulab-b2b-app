import 'server-only';

import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { SuperUser } from '@/lib/auth/types';

/**
 * Defense in depth: cada Server Action de super-admin lo llama al inicio.
 * El layout ya hace guard, pero alguien con sesión válida no-super
 * NO debe poder invocar las actions vía POST manual.
 */
export async function assertSuperAdmin(): Promise<SuperUser> {
  const me = await getCurrentUser();
  if (!me || me.kind !== 'super') redirect('/login');
  return me;
}
