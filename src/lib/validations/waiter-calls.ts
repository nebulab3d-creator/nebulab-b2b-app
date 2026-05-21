import { z } from 'zod';

export const createWaiterCallSchema = z.object({
  table_id: z.string().uuid(),
  reason: z.string().max(100).nullish(), // Texto libre, <100 chars, nullable/optional
});

export const callIdSchema = z.object({
  id: z.string().uuid(),
});

export type WaiterCallStatus = 'pending' | 'acknowledged' | 'resolved';
