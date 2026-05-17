import { z } from 'zod';

export const WAITER_CALL_REASONS = ['pedir', 'cuenta', 'otro'] as const;
export type WaiterCallReason = (typeof WAITER_CALL_REASONS)[number];

export const WAITER_CALL_REASON_LABELS: Record<WaiterCallReason, string> = {
  pedir: 'Pedir',
  cuenta: 'Cuenta',
  otro: 'Otro',
};

export const createWaiterCallSchema = z.object({
  table_id: z.string().uuid(),
  reason: z.enum(WAITER_CALL_REASONS).nullable().optional(),
});

export const callIdSchema = z.object({
  id: z.string().uuid(),
});

export type WaiterCallStatus = 'pending' | 'acknowledged' | 'resolved';
