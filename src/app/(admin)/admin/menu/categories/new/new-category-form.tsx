'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { createCategoryAction, type ActionResult } from '@/app/(admin)/admin/menu/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function NewCategoryForm() {
  const [state, action] = useFormState<ActionResult, FormData>(createCategoryAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok === true) {
      toast.success(state.message ?? 'Categoría creada');
      router.push('/admin/menu');
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          placeholder="Entradas, Platos fuertes, Bebidas, Postres…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="position">Orden (opcional)</Label>
        <Input id="position" name="position" type="number" min={0} defaultValue={0} />
        <p className="text-xs text-muted-foreground">
          Más bajo = aparece primero. Podés reordenar después con ↑↓.
        </p>
      </div>
      {state?.ok === false && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creando…' : 'Crear categoría'}
    </Button>
  );
}
