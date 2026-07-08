import { z } from 'zod';

import { DESIGN_FONTS } from './design';

/**
 * Schemas de los formularios del editor de diseño (/admin/design).
 * Separados de design.ts (documento) porque parsean FormData del admin.
 */

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Hex color, ej: #1f2937');

export const themeFormSchema = z.object({
  brand: hexColor,
  background: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
  font_heading: z.enum(DESIGN_FONTS),
  font_body: z.enum(DESIGN_FONTS),
  radius: z.enum(['square', 'rounded', 'pill']),
  density: z.enum(['compact', 'normal', 'relaxed']),
});

export const addBlockFormSchema = z.object({
  type: z.enum([
    'hero',
    'menu_category',
    'text',
    'image',
    'gallery',
    'banner',
    'button',
    'video_embed',
    'animation',
    'footer',
  ]),
  category_id: z.string().uuid().optional().or(z.literal('')),
});

export const blockRefSchema = z.object({ block_id: z.string().min(1).max(40) });

export const moveBlockFormSchema = blockRefSchema.extend({
  direction: z.enum(['up', 'down']),
});

const optionalUrl = z.string().trim().url('URL inválida').optional().or(z.literal(''));

/** Props editables por tipo de bloque (v1, forms). */
export const blockPropsFormSchemas = {
  hero: z.object({
    headline: z.string().trim().max(120).optional().or(z.literal('')),
    cover_url: optionalUrl,
    show_logo: z.coerce.boolean().optional().default(false),
  }),
  menu_category: z.object({
    category_id: z.string().uuid(),
    layout: z.enum(['cards', 'list', 'grid']),
  }),
  text: z.object({
    markdown: z.string().trim().min(1, 'El texto no puede estar vacío').max(4000),
  }),
  image: z.object({
    image_url: z.string().trim().url('URL inválida'),
    alt: z.string().trim().max(200).optional().or(z.literal('')),
    caption: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  gallery: z.object({
    // Una URL por línea en el textarea.
    image_urls: z
      .string()
      .transform((v) =>
        v
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url('URL inválida')).min(1).max(10)),
    caption: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  banner: z.object({
    text: z.string().trim().min(1).max(200),
    cta_label: z.string().trim().max(40).optional().or(z.literal('')),
    cta_url: optionalUrl,
  }),
  button: z.object({
    action: z.enum(['call_waiter', 'link']),
    label: z.string().trim().min(1).max(40),
    url: optionalUrl,
  }),
  video_embed: z.object({
    provider: z.enum(['youtube', 'vimeo']),
    video_id: z.string().trim().min(1, 'ID del video requerido').max(40),
    title: z.string().trim().max(120).optional().or(z.literal('')),
  }),
  animation: z.object({
    media_url: z.string().trim().url('URL inválida'),
    alt: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  footer: z.object({
    note: z.string().trim().max(280).optional().or(z.literal('')),
  }),
} as const;

/** Overrides comunes a todos los bloques (RF-8, por excepción). */
export const blockOverridesFormSchema = z.object({
  size: z.enum(['sm', 'md', 'lg']).optional().or(z.literal('')),
  align: z.enum(['left', 'center']).optional().or(z.literal('')),
  hide_on: z.enum(['mobile', 'desktop']).optional().or(z.literal('')),
});
