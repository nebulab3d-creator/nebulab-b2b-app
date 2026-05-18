'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

import { submitFirstTableStep, type ActionState } from '../actions';

export function FirstTableForm() {
  const [state, action] = useFormState<ActionState, FormData>(submitFirstTableStep, null);

  useEffect(() => {
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="number">Número o nombre de la mesa</Label>
        <Input
          id="number"
          name="number"
          required
          maxLength={20}
          placeholder="1, Mesa A, Terraza 3…"
        />
        <p className="text-xs text-muted-foreground">
          Cuando termines el wizard, vas a poder descargar su QR desde Mesas.
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Terminando…">Finalizar y entrar al panel →</SubmitButton>
      </div>
    </form>
  );
}
