import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('mergea clases tailwind dedupea conflictos', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('ignora valores falsy', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });
});
