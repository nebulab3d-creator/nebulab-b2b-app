import { z } from 'zod';

export const BONIFICATION_TYPES = [
  'discount_percent',
  'fixed_amount',
  'free_item',
  'other',
] as const;
export type BonificationType = (typeof BONIFICATION_TYPES)[number];

export const BONIFICATION_TYPE_LABELS: Record<BonificationType, string> = {
  discount_percent: 'Descuento %',
  fixed_amount: 'Valor fijo',
  free_item: 'Item gratis',
  other: 'Otro',
};

// ─────────────────────────── Comensal: enviar reseña ─────────────────

const contactSchema = z
  .string()
  .trim()
  .min(3, 'Contacto requerido')
  .max(120)
  .refine((v) => {
    // email simple o teléfono (digitos + opcionales `+`, espacios, guiones)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isPhone = /^[+]?[\d\s\-()]{7,}$/.test(v);
    return isEmail || isPhone;
  }, 'Debe ser email o teléfono válido');

export const createReviewSchema = z.object({
  table_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
  customer_name: z.string().trim().max(80).optional().or(z.literal('')),
  customer_contact: contactSchema,
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ─────────────────────────── Admin: configurar bonificación ─────────────────

export const bonificationSettingsSchema = z.object({
  type: z.enum(BONIFICATION_TYPES),
  value: z.string().trim().min(1).max(120),
  copy: z.string().trim().min(3).max(200),
  conditions: z.string().trim().max(500).optional().or(z.literal('')),
  expiry_days: z.coerce.number().int().min(1).max(365).default(30),
});

export type BonificationSettings = z.infer<typeof bonificationSettingsSchema>;

export const updateBonificationSchema = bonificationSettingsSchema;

// Para extender /admin/settings — Google Place ID + threshold
export const updateReviewSettingsSchema = z.object({
  google_place_id: z.string().trim().max(120).optional().or(z.literal('')),
  review_public_threshold: z.coerce.number().int().min(1).max(5).default(4),
});

export type UpdateReviewSettingsInput = z.infer<typeof updateReviewSettingsSchema>;

// Para marcar redimido desde admin
export const markRedeemedSchema = z.object({
  id: z.string().uuid(),
  redeemed: z.coerce.boolean(),
});
