import 'server-only';

import { redirect } from 'next/navigation';

import { getCurrentUser } from './get-current-user';
import type { TenantUser, UserRole } from './types';

/**
 * Exige que el usuario actual sea de un tenant. Redirige a /login si no.
 * Si pasás `roles`, exige uno de esos roles (default: cualquiera).
 *
 * Uso típico al inicio de Server Actions del admin panel.
 */
export async function requireTenantUser(roles?: UserRole[]): Promise<TenantUser> {
  const me = await getCurrentUser();
  if (!me || me.kind !== 'tenant') redirect('/login');
  if (roles && !roles.includes(me.role)) redirect('/admin');
  return me;
}
