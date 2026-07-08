import type { DesignBlock, DesignDocument, DesignTheme } from '@/lib/validations/design';
import { DESIGN_SCHEMA_VERSION } from '@/lib/validations/design';

/**
 * Plantillas de partida (RF-6). Cada preset = tema + esqueleto de bloques.
 * Los bloques menu_category se generan desde las categorías reales del tenant
 * al crear el borrador (ver createDraftFromPreset).
 */

export const DESIGN_PRESETS = [
  'elegante',
  'casual',
  'cafe',
  'comida-rapida',
  'fine-dining',
  'bar',
  'saludable',
  'tematico',
] as const;
export type DesignPreset = (typeof DESIGN_PRESETS)[number];

export const DESIGN_PRESET_LABELS: Record<DesignPreset, string> = {
  elegante: 'Elegante',
  casual: 'Casual',
  cafe: 'Café',
  'comida-rapida': 'Comida rápida',
  'fine-dining': 'Fine dining',
  bar: 'Bar / Cocteles',
  saludable: 'Saludable',
  tematico: 'Temático',
};

export const DESIGN_PRESET_DESCRIPTIONS: Record<DesignPreset, string> = {
  elegante: 'Serif clásica, tonos sobrios, espaciado relajado.',
  casual: 'Sans moderna, colores cálidos, cards con foto. Restaurante de barrio.',
  cafe: 'Tonos crema y marrón, lista compacta. Cafeterías y brunch.',
  'comida-rapida': 'Alto contraste, tipografía de impacto, grid visual. Fast food.',
  'fine-dining': 'Oscuro y dorado, serif de lujo, lista minimalista sin fotos.',
  bar: 'Fondo oscuro, acentos vibrantes, grid visual. Bares y cocteles.',
  saludable: 'Verdes frescos, sans limpia, cards con foto. Cocina saludable.',
  tematico: 'Colores intensos y tipografía de impacto para marca propia.',
};

const PRESET_THEMES: Record<DesignPreset, DesignTheme> = {
  elegante: {
    colors: {
      brand: '#8b6f47',
      background: '#faf8f5',
      surface: '#ffffff',
      text: '#241f1a',
      muted: '#6b6259',
    },
    font_heading: 'playfair',
    font_body: 'lora',
    radius: 'square',
    density: 'relaxed',
    background_image: null,
    background_overlay: 65,
  },
  casual: {
    colors: {
      brand: '#e85d3d',
      background: '#ffffff',
      surface: '#fff7f4',
      text: '#1c1917',
      muted: '#78716c',
    },
    font_heading: 'inter',
    font_body: 'inter',
    radius: 'rounded',
    density: 'normal',
    background_image: null,
    background_overlay: 65,
  },
  cafe: {
    colors: {
      brand: '#7c5a3c',
      background: '#f7f2ea',
      surface: '#fffdf9',
      text: '#2d2419',
      muted: '#7a6f5f',
    },
    font_heading: 'lora',
    font_body: 'source-sans',
    radius: 'rounded',
    density: 'compact',
    background_image: null,
    background_overlay: 65,
  },
  'comida-rapida': {
    colors: {
      brand: '#d92419',
      background: '#ffffff',
      surface: '#fef6ec',
      text: '#161413',
      muted: '#6d6660',
    },
    font_heading: 'bebas',
    font_body: 'ibm-plex',
    radius: 'pill',
    density: 'normal',
    background_image: null,
    background_overlay: 65,
  },
  'fine-dining': {
    colors: {
      brand: '#b08d3e',
      background: '#15130f',
      surface: '#201d17',
      text: '#f3ede2',
      muted: '#a89e8c',
    },
    font_heading: 'playfair',
    font_body: 'lora',
    radius: 'square',
    density: 'relaxed',
    background_image: null,
    background_overlay: 65,
  },
  bar: {
    colors: {
      brand: '#e0447a',
      background: '#131019',
      surface: '#1e1926',
      text: '#f4f0f8',
      muted: '#a79fb3',
    },
    font_heading: 'bebas',
    font_body: 'inter',
    radius: 'rounded',
    density: 'normal',
    background_image: null,
    background_overlay: 65,
  },
  saludable: {
    colors: {
      brand: '#2e7d4f',
      background: '#fbfdf9',
      surface: '#f1f7ee',
      text: '#1b2b21',
      muted: '#5f7268',
    },
    font_heading: 'source-sans',
    font_body: 'source-sans',
    radius: 'rounded',
    density: 'normal',
    background_image: null,
    background_overlay: 65,
  },
  tematico: {
    colors: {
      brand: '#6d28d9',
      background: '#fffbf2',
      surface: '#ffffff',
      text: '#241a33',
      muted: '#6f6383',
    },
    font_heading: 'bebas',
    font_body: 'ibm-plex',
    radius: 'pill',
    density: 'normal',
    background_image: null,
    background_overlay: 65,
  },
};

const PRESET_CATEGORY_LAYOUT: Record<DesignPreset, 'cards' | 'list' | 'grid'> = {
  elegante: 'list',
  casual: 'cards',
  cafe: 'list',
  'comida-rapida': 'grid',
  'fine-dining': 'list',
  bar: 'grid',
  saludable: 'cards',
  tematico: 'cards',
};

let blockSeq = 0;
function blockId(): string {
  blockSeq += 1;
  return `b-${Date.now().toString(36)}-${blockSeq}`;
}

/**
 * Construye el documento de diseño inicial de un preset con las categorías
 * activas reales del tenant (RF-6 + migración desde el menú existente).
 */
export function buildPresetDocument(
  preset: DesignPreset,
  categories: { id: string; name: string }[],
): DesignDocument {
  const layout = PRESET_CATEGORY_LAYOUT[preset];
  const blocks: DesignBlock[] = [
    {
      id: blockId(),
      type: 'hero',
      props: { show_logo: true, cover_url: null, headline: null },
      overrides: {},
    },
    ...categories.map(
      (c): DesignBlock => ({
        id: blockId(),
        type: 'menu_category',
        props: { category_id: c.id, layout },
        overrides: {},
      }),
    ),
    {
      id: blockId(),
      type: 'footer',
      props: { show_socials: true, show_hours: true, note: null },
      overrides: {},
    },
  ];

  return {
    schema_version: DESIGN_SCHEMA_VERSION,
    theme: PRESET_THEMES[preset],
    blocks,
  };
}
