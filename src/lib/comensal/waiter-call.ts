'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';
import type { WaiterCallReason, WaiterCallStatus } from '@/lib/validations/waiter-calls';

const STORAGE_KEY = 'nb3d.active_call_id';

export interface ActiveCall {
  id: string;
  table_id: string;
  status: WaiterCallStatus;
  reason: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

export function getStoredCallId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredCallId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) window.sessionStorage.setItem(STORAGE_KEY, id);
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

export type CreateResult =
  | { ok: true; call: ActiveCall }
  | { ok: false; error: 'already_active' | 'invalid_table' | 'unknown'; message: string };

/**
 * Crea la llamada vía anon client. El trigger setea `tenant_id` desde `table_id`.
 * Si ya hay una activa, el UNIQUE INDEX la rechaza con 23505.
 *
 * NO usa .select() porque anon no tiene SELECT garantizado en filas recién creadas
 * en otras tablas; acá sí tenemos policy anon SELECT abierta, pero por consistencia
 * con el patrón de ENG-003 hacemos insert + fetch separado.
 */
export async function createWaiterCall(
  tableId: string,
  reason: WaiterCallReason | null,
): Promise<CreateResult> {
  const supabase = createClient();
  const { error } = await supabase.from('waiter_calls').insert({
    table_id: tableId,
    reason,
  } as never);

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'already_active',
        message: 'Ya hay una llamada activa en esta mesa.',
      };
    }
    if (error.code === 'P0001') {
      return { ok: false, error: 'invalid_table', message: 'Mesa inválida.' };
    }
    return { ok: false, error: 'unknown', message: error.message };
  }

  // Recuperar la fila recién creada (la más reciente de esta mesa pendiente)
  const { data: row } = await supabase
    .from('waiter_calls')
    .select('id, table_id, status, reason, created_at, acknowledged_at')
    .eq('table_id', tableId)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: 'unknown', message: 'No se pudo recuperar la llamada.' };
  }
  return { ok: true, call: row as ActiveCall };
}

export async function fetchCallById(id: string): Promise<ActiveCall | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('waiter_calls')
    .select('id, table_id, status, reason, created_at, acknowledged_at')
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as ActiveCall | null;
}

/**
 * Suscribe a cambios de una llamada específica. Devuelve la unsubscribe fn.
 * Cubre UPDATE (pending→acknowledged→resolved) y DELETE.
 */
export function subscribeToCall(
  callId: string,
  onChange: (call: ActiveCall | null) => void,
): () => void {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    .channel(`waiter-call-${callId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'waiter_calls',
        filter: `id=eq.${callId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onChange(null);
        } else {
          onChange(payload.new as ActiveCall);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
