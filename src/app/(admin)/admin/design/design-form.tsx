'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import type { DesignActionResult } from './actions';

type DesignAction = (prev: DesignActionResult, formData: FormData) => Promise<DesignActionResult>;

/**
 * Form no-controlado que conecta una server action del editor con toasts.
 * `confirm` muestra window.confirm antes de enviar (acciones destructivas).
 */
export function DesignForm({
  action,
  confirm,
  className,
  children,
}: {
  action: DesignAction;
  confirm?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState<DesignActionResult, FormData>(action, null);

  useEffect(() => {
    if (state?.ok === true) {
      if (state.message) toast.success(state.message);
      for (const w of state.warnings ?? []) toast.warning(w);
    }
    if (state?.ok === false) {
      // Errores de publicación pueden ser multilínea (una validación por línea).
      for (const line of state.error.split('\n')) toast.error(line);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
