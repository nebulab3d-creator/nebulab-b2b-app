'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { sendResetEmailAction, type ActionState } from '../actions';

export function ForgotPasswordForm() {
  const [state, action] = useFormState<ActionState, FormData>(sendResetEmailAction, null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Restablecer contraseña</CardTitle>
        <CardDescription>Te enviamos un link al email registrado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state && state.ok === false && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state && state.ok === true && state.message && (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}
          <SubmitButton />
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="hover:underline">
              ← Volver a entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar link'}
    </Button>
  );
}
