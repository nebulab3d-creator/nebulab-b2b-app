'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackComensalEvent } from '@/lib/comensal/analytics';
import {
  createWaiterCall,
  fetchCallById,
  getStoredCallId,
  setStoredCallId,
  subscribeToCall,
  type ActiveCall,
} from '@/lib/comensal/waiter-call';

interface Props {
  tableId: string;
  brandColor: string | null;
}

export function WaiterCallWidget({ tableId, brandColor }: Props) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [, forceTick] = useState(0);

  // Restore from sessionStorage al cargar
  useEffect(() => {
    const stored = getStoredCallId();
    if (!stored) return;
    void fetchCallById(stored).then((c) => {
      if (!c || c.status === 'resolved') {
        setStoredCallId(null);
        setActiveCall(null);
      } else if (c.table_id === tableId) {
        setActiveCall(c);
      } else {
        // Estaba en otra mesa (mismo browser, otra QR) → limpiar
        setStoredCallId(null);
      }
    });
  }, [tableId]);

  // Subscribe to changes when there's an active call
  useEffect(() => {
    if (!activeCall) return;
    const unsubscribe = subscribeToCall(activeCall.id, (next) => {
      if (!next || next.status === 'resolved') {
        setStoredCallId(null);
        setActiveCall(null);
        toast.success('Mesero atendió tu llamada');
      } else {
        setActiveCall(next);
        if (next.status === 'acknowledged' && activeCall.status !== 'acknowledged') {
          toast.info('Tu mesero está en camino');
        }
      }
    });
    return unsubscribe;
  }, [activeCall]);

  // Re-render cada 10s para que el contador de tiempo refresque
  useEffect(() => {
    if (!activeCall) return;
    const t = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, [activeCall]);

  const handleCall = useCallback(async () => {
    if (!message.trim()) {
      toast.error('Escribí tu mensaje');
      return;
    }

    setPending(true);
    const result = await createWaiterCall(tableId, message.trim());
    setPending(false);
    setPicking(false);
    setMessage('');

    if (!result.ok) {
      toast.error(result.message);
      if (result.error === 'already_active') {
        // Refrescar para mostrar la activa
        const stored = getStoredCallId();
        if (stored) {
          const c = await fetchCallById(stored);
          if (c) setActiveCall(c);
        }
      }
      return;
    }

    setStoredCallId(result.call.id);
    setActiveCall(result.call);
    void trackComensalEvent({
      tableId,
      event: 'waiter_call' as never,
      data: { message: message.trim() },
    });
    toast.success('Mesero notificado, llegará pronto');
  }, [tableId, message]);

  if (activeCall) {
    const elapsedMin = Math.floor(
      (Date.now() - new Date(activeCall.created_at).getTime()) / 60_000,
    );
    const isAck = activeCall.status === 'acknowledged';
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-emerald-900">
            {isAck ? 'Tu mesero está en camino' : 'Mesero notificado'}
          </div>
          <div className="text-xs text-emerald-700">
            Hace {elapsedMin === 0 ? 'un momento' : `${elapsedMin} min`}
            {activeCall.reason && ` · ${activeCall.reason}`}
          </div>
        </div>
      </div>
    );
  }

  if (picking) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <div className="text-sm font-medium">¿Para qué llamás?</div>
        <Input
          placeholder="Ej: Tengo hambre, la cuenta, otra cosa..."
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          maxLength={100}
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void handleCall();
            }
          }}
        />
        <div className="text-xs text-muted-foreground">{message.length}/100</div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !message.trim()}
            onClick={() => void handleCall()}
            className="flex-1"
          >
            Enviar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            disabled={pending}
            onClick={() => {
              setPicking(false);
              setMessage('');
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      className="w-full"
      onClick={() => setPicking(true)}
      disabled={pending}
      style={brandColor ? { backgroundColor: brandColor, color: 'white' } : undefined}
    >
      Llamar al mesero
    </Button>
  );
}
