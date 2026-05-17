'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  deleteTableAction,
  updateTableAction,
  type ActionResult,
} from '@/app/(admin)/admin/tables/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

export function EditTableForm({
  tableId,
  initialNumber,
  initialActive,
}: {
  tableId: string;
  initialNumber: string;
  initialActive: boolean;
}) {
  const [state, action] = useFormState<ActionResult, FormData>(updateTableAction, null);
  const [delState, delAction] = useFormState<ActionResult, FormData>(deleteTableAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (delState?.ok === true) {
      toast.success(delState.message ?? 'Borrada');
      router.push('/admin/tables');
    }
    if (delState?.ok === false) toast.error(delState.error);
  }, [delState, router]);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={tableId} />
        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input id="number" name="number" defaultValue={initialNumber} required maxLength={20} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={initialActive} value="true" />
          Mesa activa (si está inactiva, su QR no abre nada)
        </label>
        <SubmitButton>Guardar</SubmitButton>
      </form>

      <form
        action={delAction}
        onSubmit={(e) => {
          if (!window.confirm('¿Borrar mesa? Se pierden las llamadas/reseñas asociadas.'))
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={tableId} />
        <Button type="submit" variant="destructive" size="sm">
          Borrar mesa
        </Button>
      </form>
    </div>
  );
}
