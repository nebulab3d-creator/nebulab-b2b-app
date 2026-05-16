'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import {
  deleteCategoryAction,
  updateCategoryAction,
  type ActionResult,
} from '@/app/(admin)/admin/menu/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EditCategoryForm({
  id,
  initialName,
  initialPosition,
  initialActive,
}: {
  id: string;
  initialName: string;
  initialPosition: number;
  initialActive: boolean;
}) {
  const [state, action] = useFormState<ActionResult, FormData>(updateCategoryAction, null);
  const [delState, delAction] = useFormState<ActionResult, FormData>(deleteCategoryAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (delState?.ok === true) {
      toast.success(delState.message ?? 'Borrada');
      router.push('/admin/menu');
    }
    if (delState?.ok === false) toast.error(delState.error);
  }, [delState, router]);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" defaultValue={initialName} required maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Orden</Label>
          <Input
            id="position"
            name="position"
            type="number"
            min={0}
            defaultValue={initialPosition}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={initialActive} value="true" />
          Activa (visible para el comensal)
        </label>
        <SubmitButton label="Guardar" />
      </form>

      <form
        action={delAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              '¿Borrar categoría? Los platos no se borran, quedan sin categoría asignada.',
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="destructive" size="sm">
          Borrar categoría
        </Button>
      </form>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? '…' : label}
    </Button>
  );
}
