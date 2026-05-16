import { z } from 'zod';

export const createTableSchema = z.object({
  number: z.string().trim().min(1, 'Número requerido').max(20),
});

export const updateTableSchema = z.object({
  id: z.string().uuid(),
  number: z.string().trim().min(1).max(20),
  active: z.coerce.boolean(),
});

export const tableIdSchema = z.object({ id: z.string().uuid() });

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
