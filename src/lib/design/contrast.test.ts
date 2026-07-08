import { describe, expect, it } from 'vitest';

import { contrastRatio, hexToRgb, relativeLuminance } from './contrast';

describe('hexToRgb', () => {
  it('parsea hex de 6 dígitos', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#1f2937')).toEqual({ r: 31, g: 41, b: 55 });
  });

  it('rechaza formatos inválidos', () => {
    expect(hexToRgb('fff')).toBeNull();
    expect(hexToRgb('#fff')).toBeNull();
    expect(hexToRgb('#gggggg')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('negro sobre blanco = 21 (máximo)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('es simétrico', () => {
    expect(contrastRatio('#336699', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#336699') ?? 0,
      5,
    );
  });

  it('mismo color = 1', () => {
    expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 5);
  });

  it('null si algún color es inválido', () => {
    expect(contrastRatio('rojo', '#ffffff')).toBeNull();
  });

  it('blanco tiene luminancia 1, negro 0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
});
