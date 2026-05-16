'use client';

import { createClient } from '@/lib/supabase/client';

const SESSION_KEY = 'nb3d.session_id';

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export type ComensalEvent = 'qr_scan' | 'item_view' | 'filter_used' | 'search_used' | 'menu_loaded';

interface TrackArgs {
  tableId: string;
  event: ComensalEvent;
  data?: Record<string, unknown>;
}

/**
 * Inserta evento en `analytics_events` vía cliente anon.
 * NO falla la UX si el insert falla — best-effort.
 * El trigger `set_tenant_id_from_table` setea el tenant_id automáticamente.
 */
export async function trackComensalEvent({ tableId, event, data }: TrackArgs): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('analytics_events').insert({
      // tenant_id lo setea el trigger
      table_id: tableId,
      event_type: event,
      event_data: data ?? {},
      session_id: getSessionId(),
    } as never);
  } catch {
    // best-effort
  }
}
