'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { BONIFICATION_TYPES, BONIFICATION_TYPE_LABELS } from '@/lib/validations/reviews';

import { submitReviewsStep, type ActionState } from '../actions';

interface Initial {
  review_public_threshold: number;
  google_place_id: string;
}

export function ReviewsStepForm({ initial }: { initial: Initial }) {
  const [state, action] = useFormState<ActionState, FormData>(submitReviewsStep, null);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="bonification_skip" value={skip ? 'true' : 'false'} />

      <fieldset className="space-y-3 rounded border p-4">
        <legend className="px-2 text-sm font-medium">Bonificación (opcional)</legend>
        {!skip ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue="discount_percent"
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
                <Input id="value" name="value" required placeholder="10 / 5000 / Postre" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="copy">Texto al comensal</Label>
              <Input
                id="copy"
                name="copy"
                required
                maxLength={200}
                placeholder="10% off en tu próxima visita"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiry_days">Vigencia (días)</Label>
                <Input
                  id="expiry_days"
                  name="expiry_days"
                  type="number"
                  min={1}
                  max={365}
                  defaultValue={30}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditions">Condiciones</Label>
                <Input
                  id="conditions"
                  name="conditions"
                  maxLength={500}
                  placeholder="Lun a jue, no acumulable"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSkip(true)}
              className="text-xs text-muted-foreground underline"
            >
              Saltar bonificación por ahora
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Sin bonificación. Podés configurarla después en Configuración.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setSkip(false)}>
              Configurar ahora
            </Button>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded border p-4">
        <legend className="px-2 text-sm font-medium">Reseñas</legend>
        <div className="space-y-2">
          <Label htmlFor="review_public_threshold">Threshold público (mín. estrellas)</Label>
          <Input
            id="review_public_threshold"
            name="review_public_threshold"
            type="number"
            min={1}
            max={5}
            defaultValue={initial.review_public_threshold}
            required
          />
          <p className="text-xs text-muted-foreground">
            Reseñas ≥ este valor se invitan a publicar en Google. Default 4.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="google_place_id">Google Place ID (opcional)</Label>
          <Input
            id="google_place_id"
            name="google_place_id"
            defaultValue={initial.google_place_id}
            placeholder="ChIJ..."
          />
        </div>
      </fieldset>

      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Guardando…">Continuar →</SubmitButton>
      </div>
    </form>
  );
}
