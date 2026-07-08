import { z } from 'zod';

/**
 * Schema del documento de diseño del menú (menu_designs.design).
 * Ver docs/EDITOR-VISUAL-MENU.md. `schema_version` permite evolucionar el shape
 * con migradores puros al leer (nunca mutar en DB).
 */

export const DESIGN_SCHEMA_VERSION = 1;

// ─────────────────────────── Tema ─────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex color, ej: #1f2937');

export const DESIGN_FONTS = [
  'inter',
  'playfair',
  'lora',
  'bebas',
  'ibm-plex',
  'source-sans',
] as const;
export type DesignFont = (typeof DESIGN_FONTS)[number];

export const DESIGN_FONT_LABELS: Record<DesignFont, string> = {
  inter: 'Inter (moderna)',
  playfair: 'Playfair Display (elegante)',
  lora: 'Lora (clásica)',
  bebas: 'Bebas Neue (impacto)',
  'ibm-plex': 'IBM Plex Sans (técnica)',
  'source-sans': 'Source Sans (neutra)',
};

export const themeSchema = z.object({
  colors: z.object({
    brand: hexColor,
    background: hexColor,
    surface: hexColor,
    text: hexColor,
    muted: hexColor,
  }),
  font_heading: z.enum(DESIGN_FONTS).default('inter'),
  font_body: z.enum(DESIGN_FONTS).default('inter'),
  radius: z.enum(['square', 'rounded', 'pill']).default('rounded'),
  density: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
  // Imagen de fondo opcional del menú. `background_overlay` es la opacidad (0-100)
  // del color de fondo por encima de la imagen — un velo para mantener legible el
  // texto que no está dentro de cards. Backward-compatible: docs viejos sin estos
  // campos toman los defaults al parsear.
  background_image: z.string().url().nullable().default(null),
  background_overlay: z.number().int().min(0).max(100).default(65),
});
export type DesignTheme = z.infer<typeof themeSchema>;

// ─────────────────────────── Bloques ─────────────────────────

/** Overrides por bloque — personalización por excepción (RF-8). */
const overridesSchema = z
  .object({
    size: z.enum(['sm', 'md', 'lg']).optional(),
    align: z.enum(['left', 'center']).optional(),
    hide_on: z.enum(['mobile', 'desktop']).optional(),
  })
  .default({});

const blockBase = {
  id: z.string().min(1).max(40),
  overrides: overridesSchema,
};

const heroBlock = z.object({
  ...blockBase,
  type: z.literal('hero'),
  props: z.object({
    show_logo: z.boolean().default(true),
    cover_url: z.string().url().nullable().default(null),
    headline: z.string().trim().max(120).nullable().default(null),
  }),
});

const menuCategoryBlock = z.object({
  ...blockBase,
  type: z.literal('menu_category'),
  props: z.object({
    category_id: z.string().uuid(),
    layout: z.enum(['cards', 'list', 'grid']).default('cards'),
  }),
});

const textBlock = z.object({
  ...blockBase,
  type: z.literal('text'),
  props: z.object({
    // Markdown restringido: se renderiza con sanitización, nunca HTML crudo.
    markdown: z.string().trim().min(1).max(4000),
  }),
});

const imageBlock = z.object({
  ...blockBase,
  type: z.literal('image'),
  props: z.object({
    image_url: z.string().url(),
    alt: z.string().trim().max(200).default(''),
    caption: z.string().trim().max(200).nullable().default(null),
  }),
});

const galleryBlock = z.object({
  ...blockBase,
  type: z.literal('gallery'),
  props: z.object({
    image_urls: z.array(z.string().url()).min(1).max(10),
    caption: z.string().trim().max(200).nullable().default(null),
  }),
});

const bannerBlock = z.object({
  ...blockBase,
  type: z.literal('banner'),
  props: z.object({
    text: z.string().trim().min(1).max(200),
    cta_label: z.string().trim().max(40).nullable().default(null),
    cta_url: z.string().url().nullable().default(null),
  }),
});

const buttonBlock = z.object({
  ...blockBase,
  type: z.literal('button'),
  props: z.object({
    action: z.enum(['call_waiter', 'link']),
    label: z.string().trim().min(1).max(40),
    url: z.string().url().nullable().default(null), // solo para action=link
  }),
});

/** Solo embeds en v1 (facade pattern) — sin video subido (RNF-9). */
const videoEmbedBlock = z.object({
  ...blockBase,
  type: z.literal('video_embed'),
  props: z.object({
    provider: z.enum(['youtube', 'vimeo']),
    video_id: z.string().trim().min(1).max(40),
    title: z.string().trim().max(120).default(''),
  }),
});

/** GIF / WebP animado subido. Límite duro de peso validado al subir y publicar. */
const animationBlock = z.object({
  ...blockBase,
  type: z.literal('animation'),
  props: z.object({
    media_url: z.string().url(),
    alt: z.string().trim().max(200).default(''),
  }),
});

const footerBlock = z.object({
  ...blockBase,
  type: z.literal('footer'),
  props: z.object({
    show_socials: z.boolean().default(true),
    show_hours: z.boolean().default(true),
    note: z.string().trim().max(280).nullable().default(null),
  }),
});

export const blockSchema = z.discriminatedUnion('type', [
  heroBlock,
  menuCategoryBlock,
  textBlock,
  imageBlock,
  galleryBlock,
  bannerBlock,
  buttonBlock,
  videoEmbedBlock,
  animationBlock,
  footerBlock,
]);
export type DesignBlock = z.infer<typeof blockSchema>;
export type DesignBlockType = DesignBlock['type'];

export const BLOCK_TYPE_LABELS: Record<DesignBlockType, string> = {
  hero: 'Encabezado (hero)',
  menu_category: 'Categoría del menú',
  text: 'Texto',
  image: 'Imagen',
  gallery: 'Galería',
  banner: 'Banner promocional',
  button: 'Botón de acción',
  video_embed: 'Video (YouTube/Vimeo)',
  animation: 'GIF / animación',
  footer: 'Pie de página',
};

// ─────────────────────────── Documento ─────────────────────────

export const designDocumentSchema = z.object({
  schema_version: z.literal(DESIGN_SCHEMA_VERSION),
  theme: themeSchema,
  blocks: z.array(blockSchema).min(1).max(40),
});
export type DesignDocument = z.infer<typeof designDocumentSchema>;

/** Parse tolerante para leer de DB: null si no valida (el caller decide fallback). */
export function parseDesignDocument(raw: unknown): DesignDocument | null {
  const r = designDocumentSchema.safeParse(raw);
  return r.success ? r.data : null;
}
