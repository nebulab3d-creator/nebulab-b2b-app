import type { Database } from '@/lib/supabase/database.types';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type TenantRow = Database['public']['Tables']['tenants']['Row'];
export type UserRole = 'owner' | 'manager' | 'staff';

export type AuthIdentity = { id: string; email: string };

export type CurrentUser =
  | { kind: 'tenant'; auth: AuthIdentity; profile: UserRow; tenant: TenantRow; role: UserRole }
  | { kind: 'super'; auth: AuthIdentity }
  | null;

export type AuthedUser = NonNullable<CurrentUser>;
export type TenantUser = Extract<AuthedUser, { kind: 'tenant' }>;
export type SuperUser = Extract<AuthedUser, { kind: 'super' }>;
