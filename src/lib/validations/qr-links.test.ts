import { describe, expect, it } from 'vitest';

import { updateQrLinkSchema } from './qr-links';

const id = '00000000-0000-0000-0000-000000000000';

describe('updateQrLinkSchema', () => {
  it('acepta target_url vacío (limpia el override) y coacciona active', () => {
    const r = updateQrLinkSchema.safeParse({ id, target_url: '', active: 'true' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.target_url).toBe('');
      expect(r.data.active).toBe(true);
    }
  });

  it('acepta una URL válida', () => {
    const r = updateQrLinkSchema.safeParse({
      id,
      target_url: 'https://nebulab3d.com.co/promo',
      active: 'true',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza una URL inválida', () => {
    const r = updateQrLinkSchema.safeParse({ id, target_url: 'no-es-url', active: 'true' });
    expect(r.success).toBe(false);
  });

  it('rechaza id no-uuid', () => {
    const r = updateQrLinkSchema.safeParse({ id: 'abc', target_url: '', active: 'false' });
    expect(r.success).toBe(false);
  });

  it('active sin marcar (ausente) coacciona a false', () => {
    const r = updateQrLinkSchema.safeParse({ id, target_url: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.active).toBe(false);
  });
});
