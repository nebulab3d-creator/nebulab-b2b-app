import { z } from 'zod';

/**
 * Edición del destino de un QR dinámico.
 * - target_url vacío → se limpia el override y el QR vuelve a abrir el menú de la mesa.
 * - active → permite desactivar el QR sin borrarlo.
 */
export const updateQrLinkSchema = z.object({
  id: z.string().uuid(),
  target_url: z
    .string()
    .trim()
    .max(2048)
    .url('URL inválida (debe empezar con http:// o https://)')
    .optional()
    .or(z.literal('')),
  // Checkbox desmarcado no se envía → ausente debe interpretarse como false.
  active: z.coerce.boolean().optional().default(false),
});

export const qrLinkIdSchema = z.object({ id: z.string().uuid() });

export type UpdateQrLinkInput = z.infer<typeof updateQrLinkSchema>;
