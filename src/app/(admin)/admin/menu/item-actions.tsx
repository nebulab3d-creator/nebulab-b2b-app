'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  deleteItemAction,
  reorderItemAction,
  toggleItemAvailabilityAction,
  type ActionResult,
} from '@/app/(admin)/admin/menu/items/actions';
import { Button } from '@/components/ui/button';

export function ItemInlineActions({
  itemId,
  available,
  canUp,
  canDown,
}: {
  itemId: string;
  available: boolean;
  canUp: boolean;
  canDown: boolean;
}) {
  const router = useRouter();
  const [tState, toggle] = useFormState<ActionResult, FormData>(toggleItemAvailabilityAction, null);
  const [dState, del] = useFormState<ActionResult, FormData>(deleteItemAction, null);

  useEffect(() => {
    if (tState?.ok === false) toast.error(tState.error);
  }, [tState]);

  useEffect(() => {
    if (dState?.ok === true) toast.success('Plato borrado');
    if (dState?.ok === false) toast.error(dState.error);
  }, [dState]);

  return (
    <div className="flex items-center gap-1">
      <ReorderForm itemId={itemId} direction="up" disabled={!canUp} />
      <ReorderForm itemId={itemId} direction="down" disabled={!canDown} />
      <form action={toggle}>
        <input type="hidden" name="id" value={itemId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          title={available ? 'Ocultar plato' : 'Mostrar plato'}
          aria-label={available ? 'Ocultar plato' : 'Mostrar plato'}
        >
          {available ? '👁️' : '🙈'}
        </Button>
      </form>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/menu/items/${itemId}`)}
      >
        Editar
      </Button>
      <form
        action={del}
        onSubmit={(e) => {
          if (!window.confirm('¿Borrar plato? Acción irreversible.')) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={itemId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          aria-label="Borrar"
          title="Borrar plato"
        >
          🗑️
        </Button>
      </form>
    </div>
  );
}

function ReorderForm({
  itemId,
  direction,
  disabled,
}: {
  itemId: string;
  direction: 'up' | 'down';
  disabled: boolean;
}) {
  const [, action] = useFormState<ActionResult, FormData>(reorderItemAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="direction" value={direction} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={direction === 'up' ? 'Subir' : 'Bajar'}
      >
        {direction === 'up' ? '↑' : '↓'}
      </Button>
    </form>
  );
}
