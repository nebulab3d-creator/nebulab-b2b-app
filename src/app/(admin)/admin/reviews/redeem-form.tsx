'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { setRedeemedAction, type ActionResult } from './actions';

export function RedeemForm({ id, currentlyRedeemed }: { id: string; currentlyRedeemed: boolean }) {
  const [state, action] = useFormState<ActionResult, FormData>(setRedeemedAction, null);
  useEffect(() => {
    if (state?.ok === true) toast.success(currentlyRedeemed ? 'Desmarcada' : 'Marcada redimida');
    if (state?.ok === false) toast.error(state.error);
  }, [state, currentlyRedeemed]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redeemed" value={currentlyRedeemed ? 'false' : 'true'} />
      <Button type="submit" variant={currentlyRedeemed ? 'outline' : 'default'} size="sm">
        {currentlyRedeemed ? 'Desmarcar' : 'Marcar redimida'}
      </Button>
    </form>
  );
}
