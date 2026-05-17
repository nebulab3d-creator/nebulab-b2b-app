'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

import { updateReviewSettingsAction, type ActionResult } from './actions';

interface Initial {
  google_place_id: string;
  review_public_threshold: number;
}

export function ReviewSettingsForm({ initial }: { initial: Initial }) {
  const [state, action] = useFormState<ActionResult, FormData>(updateReviewSettingsAction, null);

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Guardado');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
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
          Reseñas con rating ≥ este valor son consideradas públicas (se invita a publicar en
          Google). Por debajo, quedan internas para el equipo. Default 4.
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
        <p className="text-xs text-muted-foreground">
          Sin esto, no mostramos botón &ldquo;Publicá en Google&rdquo;. Encontrá tu Place ID en{' '}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            place-id finder
          </a>
          .
        </p>
      </div>
      <SubmitButton pendingLabel="Guardando…">Guardar ajustes</SubmitButton>
    </form>
  );
}
