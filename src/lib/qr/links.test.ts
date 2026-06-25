import { describe, expect, it, vi } from 'vitest';

// generate.ts importa next/headers; lo neutralizamos para testear generateQrCode aislado.
vi.mock('next/headers', () => ({ headers: () => new Map() }));

import { generateQrCode } from './links';

describe('generateQrCode', () => {
  it('genera un código de 12 chars url-safe', () => {
    const code = generateQrCode();
    expect(code).toHaveLength(12);
    // base64url: A-Z a-z 0-9 - _ (sin +, /, =)
    expect(code).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });

  it('genera códigos únicos (sin colisiones en 5000 iteraciones)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 5000; i++) set.add(generateQrCode());
    expect(set.size).toBe(5000);
  });
});
