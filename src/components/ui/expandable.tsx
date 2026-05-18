'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Sección colapsable controlada por estado local. El header acepta children
 * para el contenido principal Y un slot `actions` para botones que NO deben
 * disparar el toggle (los botones quedan fuera del <button>).
 */
export function Expandable({
  defaultOpen = true,
  header,
  actions,
  children,
  className,
}: {
  defaultOpen?: boolean;
  header: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('rounded-md border bg-card', className)}>
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <ChevronDownIcon
            className={cn('size-4 shrink-0 transition-transform', open ? '' : '-rotate-90')}
          />
          {header}
        </button>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {open && <div className="space-y-2 border-t p-4">{children}</div>}
    </section>
  );
}
