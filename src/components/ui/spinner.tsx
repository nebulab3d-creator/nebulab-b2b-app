import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const sizeMap = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
} as const;

export type SpinnerSize = keyof typeof sizeMap;

/**
 * Spinner inline. Hereda `currentColor` para integrar con cualquier botón o
 * texto. Tamaño por defecto `md` (20px). Marcado como `aria-hidden` porque
 * el feedback de loading lo da el botón/texto circundante con su `aria-busy`.
 */
export function Spinner({ size = 'md', className }: { size?: SpinnerSize; className?: string }) {
  return <Loader2 aria-hidden="true" className={cn('animate-spin', sizeMap[size], className)} />;
}
