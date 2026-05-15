import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Mínimo 3 caracteres')
  .max(40, 'Máximo 40 caracteres')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones');

export const createTenantWithOwnerSchema = z.object({
  // Tenant
  slug: slugSchema,
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
  plan: z.enum(['basic']).default('basic'),
  // Owner
  owner_email: z.string().trim().toLowerCase().email('Email inválido'),
  owner_full_name: z.string().trim().min(2, 'Nombre requerido').max(80),
});

export const updateTenantSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  plan: z.enum(['basic']).default('basic'),
});

export const setTenantStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'suspended', 'cancelled']),
});

export const resetOwnerPasswordSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
});

export type CreateTenantWithOwnerInput = z.infer<typeof createTenantWithOwnerSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type SetTenantStatusInput = z.infer<typeof setTenantStatusSchema>;
