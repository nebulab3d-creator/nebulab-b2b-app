'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  BONIFICATION_TYPES,
  BONIFICATION_TYPE_LABELS,
  type BonificationSettings,
} from '@/lib/validations/reviews';

import { updateBonificationAction, type ActionResult } from './actions';

export function BonificationForm({
  initial,
  hasExisting,
}: {
  initial: BonificationSettings;
  hasExisting: boolean;
}) {
  const [state, action] = useFormState<ActionResult, FormData>(updateBonificationAction, null);

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Guardado');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      {!hasExisting && (
        <p className="text-xs text-muted-foreground">
          Sin bonificación configurada, no se emiten códigos. El comensal igual puede dejar reseña.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <select
          id="type"
          name="type"
          defaultValue={initial.type}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          {BONIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {BONIFICATION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">Valor</Label>
        <Input
          id="value"
          name="value"
          defaultValue={initial.value}
          required
          placeholder="10 (para %) · 5000 (COP) · Postre del día"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="copy">Texto que ve el comensal</Label>
        <Input
          id="copy"
          name="copy"
          defaultValue={initial.copy}
          required
          maxLength={200}
          placeholder="10% off en tu próxima visita"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conditions">Condiciones (opcional)</Label>
        <textarea
          id="conditions"
          name="conditions"
          defaultValue={initial.conditions ?? ''}
          rows={2}
          maxLength={500}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Válido lunes a jueves, no acumulable"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expiry_days">Vigencia (días)</Label>
        <Input
          id="expiry_days"
          name="expiry_days"
          type="number"
          min={1}
          max={365}
          defaultValue={initial.expiry_days}
          required
        />
      </div>
      <SubmitButton pendingLabel="Guardando…">Guardar bonificación</SubmitButton>
    </form>
  );
}
