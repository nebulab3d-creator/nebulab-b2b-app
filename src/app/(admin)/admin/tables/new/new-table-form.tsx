'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { createTableAction, type ActionResult } from '@/app/(admin)/admin/tables/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

export function NewTableForm() {
  const [state, action] = useFormState<ActionResult, FormData>(createTableAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok === true) {
      toast.success(state.message ?? 'Mesa creada');
      router.push('/admin/tables');
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="number">Número o nombre</Label>
        <Input id="number" name="number" required maxLength={20} placeholder="1, 2, Mesa A…" />
        <p className="text-xs text-muted-foreground">
          Cada mesa va a tener su QR único. El número debe ser único dentro del restaurante.
        </p>
      </div>
      {state?.ok === false && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-full" pendingLabel="Creando…">
        Crear mesa
      </SubmitButton>
    </form>
  );
}
