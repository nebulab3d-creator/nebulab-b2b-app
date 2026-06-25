'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import type { ActionResult } from '@/app/(admin)/admin/tables/actions';
import { regenerateQrCodeAction, updateQrLinkAction } from '@/app/(admin)/admin/tables/qr-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

export function QrLinkForm({
  linkId,
  initialTargetUrl,
  initialActive,
  canEdit,
}: {
  linkId: string;
  initialTargetUrl: string | null;
  initialActive: boolean;
  canEdit: boolean;
}) {
  const [state, action] = useFormState<ActionResult, FormData>(updateQrLinkAction, null);
  const [regenState, regenAction] = useFormState<ActionResult, FormData>(
    regenerateQrCodeAction,
    null,
  );

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (regenState?.ok === true) toast.success(regenState.message ?? 'Listo');
    if (regenState?.ok === false) toast.error(regenState.error);
  }, [regenState]);

  if (!canEdit) {
    return (
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Solo owner o manager puede editar el destino del QR.
      </p>
    );
  }

  return (
    <div className="space-y-4 border-t pt-3">
      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={linkId} />
        <div className="space-y-2">
          <Label htmlFor="target_url">Destino personalizado (opcional)</Label>
          <Input
            id="target_url"
            name="target_url"
            type="url"
            inputMode="url"
            placeholder="https://…"
            defaultValue={initialTargetUrl ?? ''}
            maxLength={2048}
          />
          <p className="text-xs text-muted-foreground">
            Si lo dejás vacío, el QR abre el menú de esta mesa. Si ponés una URL, el mismo QR
            impreso redirige ahí (podés cambiarlo cuando quieras).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={initialActive} value="true" />
          QR activo (si lo desactivás, no abre nada)
        </label>
        <SubmitButton>Guardar destino</SubmitButton>
      </form>

      <form
        action={regenAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              '¿Regenerar el código? El QR ya impreso dejará de funcionar y tendrás que reimprimirlo.',
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={linkId} />
        <Button type="submit" variant="outline" size="sm">
          Regenerar código
        </Button>
      </form>
    </div>
  );
}
