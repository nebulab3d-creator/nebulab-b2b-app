'use client';

import { useFormState } from 'react-dom';

import { changePasswordAction, type ActionState } from '@/app/(auth)/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

export function ChangePasswordForm() {
  const [state, action] = useFormState<ActionState, FormData>(changePasswordAction, null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Cambiá tu contraseña</CardTitle>
        <CardDescription>
          La contraseña temporal expira ahora. Elegí una nueva (mínimo 8 caracteres).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva contraseña</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {state && state.ok === false && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar y continuar
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
