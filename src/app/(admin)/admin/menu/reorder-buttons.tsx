'use client';

import { useFormState } from 'react-dom';

import { Button } from '@/components/ui/button';

import { reorderCategoryAction, type ActionResult } from './actions';

export function ReorderButtons({
  id,
  canUp,
  canDown,
}: {
  id: string;
  canUp: boolean;
  canDown: boolean;
}) {
  const [, action] = useFormState<ActionResult, FormData>(reorderCategoryAction, null);
  return (
    <div className="flex flex-col gap-1">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <Button type="submit" variant="ghost" size="sm" disabled={!canUp} aria-label="Subir">
          ↑
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <Button type="submit" variant="ghost" size="sm" disabled={!canDown} aria-label="Bajar">
          ↓
        </Button>
      </form>
    </div>
  );
}
