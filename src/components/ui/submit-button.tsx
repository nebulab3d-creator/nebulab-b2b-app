'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ButtonProps = React.ComponentProps<typeof Button>;

export interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  /** Texto/JSX a mostrar mientras el form está en pending. Si no se pasa, se mantiene el label original con spinner al lado. */
  pendingLabel?: React.ReactNode;
}

/**
 * Botón de submit con feedback de loading. Lee el estado del form padre con
 * `useFormStatus()` — solo funciona dentro de un <form action={...}>.
 *
 * Para botones fuera de un form (acciones async ad-hoc), usar <Button> con
 * <Spinner> manual.
 */
export function SubmitButton({ pendingLabel, children, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Spinner size="sm" className="mr-2" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
