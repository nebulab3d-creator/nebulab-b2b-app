'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  acknowledgeCallAction,
  resolveCallAction,
  type ActionResult,
} from '@/app/(admin)/admin/calls/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { WaiterCallStatus } from '@/lib/validations/waiter-calls';

interface CallRow {
  id: string;
  table_id: string;
  status: WaiterCallStatus;
  reason: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

interface Props {
  tenantId: string;
  initialCalls: CallRow[];
  tableNumbers: Record<string, string>;
}

// Beep generado con Web Audio API. No requiere asset bundleado.
function beep(audioCtx: AudioContext) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 800;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export function CallsDashboard({ tenantId, initialCalls, tableNumbers }: Props) {
  const [calls, setCalls] = useState<CallRow[]>(initialCalls);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [, forceTick] = useState(0);

  // Refresh cada 10s para que los timers de "hace X min" actualicen
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tenant-calls-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as CallRow;
            setCalls((prev) =>
              prev.some((c) => c.id === row.id) ? prev : [...prev, row].sort(byCreated),
            );
            if (audioCtxRef.current) beep(audioCtxRef.current);
            toast.info(`Mesa ${tableNumbers[row.table_id] ?? '?'} te llama`);
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as CallRow;
            setCalls((prev) =>
              row.status === 'resolved'
                ? prev.filter((c) => c.id !== row.id)
                : prev.map((c) => (c.id === row.id ? row : c)),
            );
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string };
            setCalls((prev) => prev.filter((c) => c.id !== old.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, tableNumbers]);

  const enableSound = useCallback(() => {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    audioCtxRef.current = ctx;
    beep(ctx); // beep de prueba para confirmar
    setSoundEnabled(true);
  }, []);

  return (
    <div className="space-y-4">
      {!soundEnabled && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <span>🔔 Activá el sonido para escuchar cuando una mesa te llame.</span>
          <Button size="sm" onClick={enableSound}>
            Activar sonido
          </Button>
        </div>
      )}

      {calls.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sin llamadas activas. Cuando una mesa llame al mesero, aparecerá acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((c) => (
            <CallCard key={c.id} call={c} tableNumber={tableNumbers[c.table_id] ?? '?'} />
          ))}
        </div>
      )}
    </div>
  );
}

function byCreated(a: CallRow, b: CallRow) {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

function CallCard({ call, tableNumber }: { call: CallRow; tableNumber: string }) {
  const ageMin = Math.floor((Date.now() - new Date(call.created_at).getTime()) / 60_000);
  const tone =
    ageMin < 1
      ? 'border-emerald-300 bg-emerald-50'
      : ageMin < 3
        ? 'border-amber-300 bg-amber-50'
        : 'border-red-300 bg-red-50';

  return (
    <div className={`flex items-center justify-between gap-4 rounded-md border p-4 ${tone}`}>
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold">Mesa {tableNumber}</div>
        <div>
          <div className="text-sm">
            {call.reason ? <span className="capitalize">{call.reason}</span> : 'Sin razón'}
            {call.status === 'acknowledged' && (
              <Badge variant="outline" className="ml-2">
                en camino
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Hace {ageMin === 0 ? 'un momento' : `${ageMin} min`}
          </div>
        </div>
      </div>
      <CallActions call={call} />
    </div>
  );
}

function CallActions({ call }: { call: CallRow }) {
  return (
    <div className="flex gap-2">
      {call.status === 'pending' && <AckForm id={call.id} />}
      <ResolveForm id={call.id} />
    </div>
  );
}

function AckForm({ id }: { id: string }) {
  const [state, action] = useFormState<ActionResult, FormData>(acknowledgeCallAction, null);
  useEffect(() => {
    if (state?.ok === true) toast.success('En camino');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm">
        Voy en camino
      </Button>
    </form>
  );
}

function ResolveForm({ id }: { id: string }) {
  const [state, action] = useFormState<ActionResult, FormData>(resolveCallAction, null);
  useEffect(() => {
    if (state?.ok === true) toast.success('Atendida');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm">
        Atendida
      </Button>
    </form>
  );
}
