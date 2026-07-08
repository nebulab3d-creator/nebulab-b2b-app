/**
 * Contraste WCAG 2.1 para las validaciones de publicación (RF-12).
 * Sin dependencias: luminancia relativa + ratio según spec.
 */

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  const digits = m?.[1];
  if (!digits) return null;
  const n = parseInt(digits, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Ratio de contraste WCAG (1..21). Null si algún color es inválido. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA texto normal: ≥4.5. */
export const WCAG_AA_NORMAL = 4.5;
/** AA texto grande / componentes UI: ≥3. */
export const WCAG_AA_LARGE = 3;
