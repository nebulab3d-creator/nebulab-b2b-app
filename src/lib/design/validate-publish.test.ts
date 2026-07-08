import { describe, expect, it } from 'vitest';

import type { DesignBlock, DesignDocument } from '@/lib/validations/design';
import { DESIGN_SCHEMA_VERSION, designDocumentSchema } from '@/lib/validations/design';

import { buildPresetDocument, DESIGN_PRESETS } from './presets';
import { validatePublish } from './validate-publish';

const CAT_A = '11111111-1111-4111-8111-111111111111';
const CAT_B = '22222222-2222-4222-8222-222222222222';

function baseDoc(blocks?: DesignBlock[]): DesignDocument {
  return {
    schema_version: DESIGN_SCHEMA_VERSION,
    theme: {
      colors: {
        brand: '#7c3aed',
        background: '#ffffff',
        surface: '#f8f7fb',
        text: '#1c1917',
        muted: '#6b7280',
      },
      font_heading: 'inter',
      font_body: 'inter',
      radius: 'rounded',
      density: 'normal',
      background_image: null,
      background_overlay: 65,
    },
    blocks: blocks ?? [
      {
        id: 'h1',
        type: 'hero',
        props: { show_logo: true, cover_url: null, headline: null },
        overrides: {},
      },
      {
        id: 'm1',
        type: 'menu_category',
        props: { category_id: CAT_A, layout: 'cards' },
        overrides: {},
      },
    ],
  };
}

const ctx = { validCategoryIds: new Set([CAT_A, CAT_B]) };

describe('designDocumentSchema', () => {
  it('acepta el documento base', () => {
    expect(designDocumentSchema.safeParse(baseDoc()).success).toBe(true);
  });

  it('acepta los documentos de los 8 presets y todos pasan las validaciones de publish', () => {
    for (const preset of DESIGN_PRESETS) {
      const doc = buildPresetDocument(preset, [
        { id: CAT_A, name: 'Entradas' },
        { id: CAT_B, name: 'Platos' },
      ]);
      const r = designDocumentSchema.safeParse(doc);
      expect(r.success, `preset ${preset}: schema`).toBe(true);
      // Todo preset debe poder publicarse tal cual (contraste WCAG incluido).
      const { errors } = validatePublish(doc, ctx);
      expect(errors, `preset ${preset}: publish`).toEqual([]);
    }
  });

  it('rechaza schema_version desconocida', () => {
    const doc = { ...baseDoc(), schema_version: 99 };
    expect(designDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it('rechaza bloques de tipo desconocido', () => {
    const doc = {
      ...baseDoc(),
      blocks: [{ id: 'x', type: 'iframe', props: {}, overrides: {} }],
    };
    expect(designDocumentSchema.safeParse(doc).success).toBe(false);
  });
});

describe('validatePublish', () => {
  it('pasa con el documento base', () => {
    const { errors } = validatePublish(baseDoc(), ctx);
    expect(errors).toEqual([]);
  });

  it('no valida contraste: colores de bajo contraste no bloquean', () => {
    const doc = baseDoc();
    doc.theme.colors.text = '#eeeeee'; // casi blanco sobre blanco
    doc.theme.colors.brand = '#fafafa';
    const { errors } = validatePublish(doc, ctx);
    expect(errors.some((e) => e.includes('Contraste'))).toBe(false);
    expect(errors).toEqual([]);
  });

  it('bloquea diseño sin bloques de menú', () => {
    const doc = baseDoc([
      {
        id: 'h1',
        type: 'hero',
        props: { show_logo: true, cover_url: null, headline: null },
        overrides: {},
      },
    ]);
    const { errors } = validatePublish(doc, ctx);
    expect(errors.some((e) => e.includes('categoría del menú'))).toBe(true);
  });

  it('bloquea referencias a categorías inexistentes', () => {
    const doc = baseDoc();
    const { errors } = validatePublish(doc, {
      validCategoryIds: new Set(['33333333-3333-4333-8333-333333333333']),
    });
    expect(errors.some((e) => e.includes('ya no existe'))).toBe(true);
  });

  it('advierte (no bloquea) categoría sin platos', () => {
    const { errors, warnings } = validatePublish(baseDoc(), {
      ...ctx,
      emptyCategoryIds: new Set([CAT_A]),
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('platos disponibles'))).toBe(true);
  });

  it('advierte (no bloquea) imagen de fondo con poco velo', () => {
    const doc = baseDoc();
    doc.theme.background_image = 'https://x.co/bg.jpg';
    doc.theme.background_overlay = 20;
    const { errors, warnings } = validatePublish(doc, ctx);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('velo'))).toBe(true);
  });

  it('imagen de fondo con velo alto no advierte', () => {
    const doc = baseDoc();
    doc.theme.background_image = 'https://x.co/bg.jpg';
    doc.theme.background_overlay = 80;
    const { warnings } = validatePublish(doc, ctx);
    expect(warnings.some((w) => w.includes('velo'))).toBe(false);
  });

  it('bloquea animación como primer bloque', () => {
    const doc = baseDoc([
      {
        id: 'a1',
        type: 'animation',
        props: { media_url: 'https://x.co/a.gif', alt: '' },
        overrides: {},
      },
      {
        id: 'm1',
        type: 'menu_category',
        props: { category_id: CAT_A, layout: 'cards' },
        overrides: {},
      },
    ]);
    const { errors } = validatePublish(doc, ctx);
    expect(errors.some((e) => e.includes('primer bloque'))).toBe(true);
  });

  it('bloquea más de 2 animaciones', () => {
    const anim = (id: string): DesignBlock => ({
      id,
      type: 'animation',
      props: { media_url: 'https://x.co/a.gif', alt: '' },
      overrides: {},
    });
    const doc = baseDoc([
      {
        id: 'm1',
        type: 'menu_category',
        props: { category_id: CAT_A, layout: 'cards' },
        overrides: {},
      },
      anim('a1'),
      anim('a2'),
      anim('a3'),
    ]);
    const { errors } = validatePublish(doc, ctx);
    expect(errors.some((e) => e.includes('Máximo 2'))).toBe(true);
  });

  it('bloquea botón de link sin URL', () => {
    const doc = baseDoc([
      {
        id: 'm1',
        type: 'menu_category',
        props: { category_id: CAT_A, layout: 'cards' },
        overrides: {},
      },
      {
        id: 'b1',
        type: 'button',
        props: { action: 'link', label: 'Síguenos', url: null },
        overrides: {},
      },
    ]);
    const { errors } = validatePublish(doc, ctx);
    expect(errors.some((e) => e.includes('Síguenos'))).toBe(true);
  });
});
