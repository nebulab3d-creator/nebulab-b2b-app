'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  deleteCategoryAction,
  reorderCategoryAction,
  type ActionResult,
} from '@/app/(admin)/admin/menu/actions';
import { Button } from '@/components/ui/button';

export function CategoryInlineActions({
  categoryId,
  canUp,
  canDown,
}: {
  categoryId: string;
  canUp: boolean;
  canDown: boolean;
}) {
  const router = useRouter();
  const [dState, del] = useFormState<ActionResult, FormData>(deleteCategoryAction, null);

  useEffect(() => {
    if (dState?.ok === true) toast.success('Categoría borrada');
    if (dState?.ok === false) toast.error(dState.error);
  }, [dState]);

  return (
    <>
      <ReorderForm categoryId={categoryId} direction="up" disabled={!canUp} />
      <ReorderForm categoryId={categoryId} direction="down" disabled={!canDown} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/menu/categories/${categoryId}`)}
      >
        Editar
      </Button>
      <form
        action={del}
        onSubmit={(e) => {
          if (
            !window.confirm(
              '¿Borrar categoría? Los platos no se borran, quedan sin categoría asignada.',
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={categoryId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          aria-label="Borrar categoría"
          title="Borrar categoría"
        >
          🗑️
        </Button>
      </form>
    </>
  );
}

function ReorderForm({
  categoryId,
  direction,
  disabled,
}: {
  categoryId: string;
  direction: 'up' | 'down';
  disabled: boolean;
}) {
  const [, action] = useFormState<ActionResult, FormData>(reorderCategoryAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={categoryId} />
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
