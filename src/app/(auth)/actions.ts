'use server';

import { redirect } from 'next/navigation';

import { safeNext } from '@/lib/auth/redirects';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth';

export type ActionState = { ok: false; error: string } | { ok: true; message?: string } | null;

function flattenZodError(issues: { message: string }[]): string {
  return issues.map((i) => i.message).join(' · ');
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flattenZodError(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: 'Email o contraseña incorrectos' };

  // Decidir destino: super_admin → /super, tenant user → /admin (o ?next= si viene safe)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sesión inválida' };

  const { data: superRow } = await supabase
    .from('super_admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  const next = safeNext(parsed.data.next ?? null);
  // Si next existe, layouts se encargarán de aceptarlo o redirigir según el rol.
  redirect(next ?? (superRow ? '/super' : '/admin'));
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function sendResetEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flattenZodError(parsed.error.issues) };

  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // Nunca revelamos si el email existe o no — siempre devolvemos OK.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });
  return {
    ok: true,
    message: 'Si el email existe, te enviamos instrucciones para restablecer tu contraseña.',
  };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flattenZodError(parsed.error.issues) };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: 'No se pudo restablecer. El link puede haber expirado.' };

  redirect('/admin');
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: flattenZodError(parsed.error.issues) };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error: pwErr } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (pwErr) return { ok: false, error: 'No se pudo cambiar la contraseña' };

  // RLS solo deja UPDATE de users a 'owner' del tenant; un staff/manager no puede
  // bajar su propio flag. Usamos service_role acotado a este caso (auth ya verificada arriba).
  const admin = createAdminClient();
  await admin.from('users').update({ must_change_password: false }).eq('id', user.id);

  redirect('/admin');
}
