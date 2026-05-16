'use client';

import { useEffect } from 'react';

import { trackComensalEvent } from '@/lib/comensal/analytics';

/**
 * Dispara el evento `qr_scan` una sola vez por mount.
 * El comensal puede entrar a la URL directo (no solo escaneando) — lo tratamos igual.
 */
export function TrackQrScan({ tableId }: { tableId: string }) {
  useEffect(() => {
    void trackComensalEvent({ tableId, event: 'qr_scan' });
  }, [tableId]);
  return null;
}
