import { z } from 'zod';

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
  'nut_free',
  'spicy',
  'mild',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  gluten_free: 'Sin gluten',
  lactose_free: 'Sin lactosa',
  nut_free: 'Sin nueces',
  spicy: 'Picante',
  mild: 'No picante',
};

// ─────────────────────────── Categorías ─────────────────────────

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  position: z.coerce.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  position: z.coerce.number().int().min(0),
  active: z.coerce.boolean(),
});

// ─────────────────────────── Items ─────────────────────────

const macrosSchema = z
  .object({
    calories: z.coerce.number().min(0).optional(),
    protein: z.coerce.number().min(0).optional(),
    carbs: z.coerce.number().min(0).optional(),
    fat: z.coerce.number().min(0).optional(),
  })
  .partial();

// Helper para parsear lista de strings desde un textarea (uno por línea o coma-separados)
const stringList = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const createItemBaseSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  price: z.coerce.number().min(0).max(99999999.99),
  ingredients: stringList,
  dietary_tags: z
    .preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.enum(DIETARY_TAGS)))
    .default([]),
  macros: macrosSchema.default({}),
  available: z.coerce.boolean().default(true),
  position: z.coerce.number().int().min(0).default(0),
});

export const updateItemSchema = createItemBaseSchema.extend({
  id: z.string().uuid(),
});

export const reorderSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(['up', 'down']),
});

// ─────────────────────────── Tenant settings ─────────────────

export const updateTenantSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  brand_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/i, 'Hex color, ej: #1f2937')
    .optional()
    .or(z.literal('')),
  logo_url: z.string().trim().url('URL inválida').optional().or(z.literal('')),
  welcome_message: z.string().trim().max(280).optional().or(z.literal('')),
});

export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;
