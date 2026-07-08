'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { createDraftFromPublishedAction } from './actions';

/**
 * Crea un borrador desde el diseño publicado y navega (duro) al editor.
 * La navegación dura evita el refetch-loop de la transición soft (RSC).
 */
export function CreateFromPublishedButton() {
  const [creating, setCreating] = useState(false);
  return (
    <Button
      disabled={creating}
      onClick={async () => {
        setCreating(true);
        const r = await createDraftFromPublishedAction();
        if (r?.ok === false) {
          toast.error(r.error);
          setCreating(false);
          return;
        }
        window.location.assign('/admin/design');
      }}
    >
      {creating ? 'Creando…' : 'Crear borrador desde el diseño publicado'}
    </Button>
  );
}
