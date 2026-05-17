'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  submitReviewAction,
  type SubmitReviewResult,
} from '@/app/(comensal)/r/[slug]/t/[tableId]/review-actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { trackComensalEvent } from '@/lib/comensal/analytics';

interface Props {
  tableId: string;
  brandColor: string | null;
  bonusCopy: string | null;
}

export function ReviewWidget({ tableId, brandColor, bonusCopy }: Props) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitReviewResult | null>(null);
  const [state, action] = useFormState<SubmitReviewResult | null, FormData>(
    submitReviewAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true) {
      setSubmitted(state);
      void trackComensalEvent({
        tableId,
        event: 'review_submitted' as never,
        data: { is_public: state.isPublic, bonus: !!state.bonusCode },
      });
    }
    if (state?.ok === false) toast.error(state.error);
  }, [state, tableId]);

  if (submitted?.ok) {
    return <SubmittedView result={submitted} onClose={() => setOpen(false)} />;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
      >
        ⭐ Dejá una reseña{bonusCopy ? ` y ganá ${bonusCopy}` : ''}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">¿Cómo te fue?</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          Cerrar
        </button>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="table_id" value={tableId} />
        <RatingPicker />
        <div className="space-y-1">
          <Label htmlFor="comment">Comentario (opcional)</Label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            maxLength={2000}
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="customer_name">Tu nombre (opcional)</Label>
          <Input id="customer_name" name="customer_name" maxLength={80} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="customer_contact">Email o teléfono</Label>
          <Input
            id="customer_contact"
            name="customer_contact"
            required
            placeholder="vos@email.com o +57 300 123 4567"
          />
          <p className="text-xs text-muted-foreground">
            Para enviarte la bonificación. No se publica.
          </p>
        </div>
        <SubmitButton
          className="w-full"
          pendingLabel="Enviando…"
          style={brandColor ? { backgroundColor: brandColor, color: 'white' } : undefined}
        >
          Enviar reseña
        </SubmitButton>
      </form>
    </div>
  );
}

function RatingPicker() {
  const [rating, setRating] = useState(0);
  return (
    <div className="space-y-1">
      <Label>Tu calificación</Label>
      <input type="hidden" name="rating" value={rating} required />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-3xl leading-none transition-colors ${
              n <= rating ? 'text-amber-500' : 'text-gray-300'
            }`}
            aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmittedView({
  result,
  onClose,
}: {
  result: Extract<SubmitReviewResult, { ok: true }>;
  onClose: () => void;
}) {
  if (!result.isPublic) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <h3 className="font-semibold text-emerald-900">Gracias por tu feedback</h3>
        <p className="text-sm text-emerald-800">
          Lo tomamos en serio. El equipo del restaurante se va a contactar si dejaste tus datos.
        </p>
        <button onClick={onClose} className="text-xs text-emerald-700 underline">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-semibold">¡Gracias! 🎉</h3>
      {result.bonusCode && (
        <div className="rounded border border-dashed border-amber-400 bg-white p-3 text-center">
          <div className="text-xs tracking-wide text-muted-foreground uppercase">Tu código</div>
          <div className="mt-1 font-mono text-2xl tracking-widest">{result.bonusCode}</div>
          {result.bonusCopy && (
            <div className="mt-1 text-xs text-muted-foreground">{result.bonusCopy}</div>
          )}
          {result.emailSent && (
            <div className="mt-2 text-xs text-muted-foreground">
              También te lo mandamos por email
            </div>
          )}
        </div>
      )}
      {result.googleReviewUrl && (
        <a
          href={result.googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white"
        >
          Publicá esta reseña en Google →
        </a>
      )}
      <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground">
        Cerrar
      </button>
    </div>
  );
}
