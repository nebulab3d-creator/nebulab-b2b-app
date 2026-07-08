'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { revertDesignAction } from './actions';

export interface ArchivedVersion {
  id: string;
  version: number;
  published_at: string | null;
}

export function VersionHistory({ versions }: { versions: ArchivedVersion[] }) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay versiones anteriores. Se guardan al publicar cambios.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="text-sm">
            <span className="font-medium">Versión {v.version}</span>
            {v.published_at && (
              <span className="pl-2 text-xs text-muted-foreground">
                {new Date(v.published_at).toLocaleString('es-CO')}
              </span>
            )}
          </div>
          <RevertButton archivedId={v.id} />
        </li>
      ))}
    </ul>
  );
}

function RevertButton({ archivedId }: { archivedId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm('¿Restaurar esta versión? Se publicará inmediatamente.')) return;
        setPending(true);
        const fd = new FormData();
        fd.set('archived_id', archivedId);
        const r = await revertDesignAction(null, fd);
        if (r?.ok === false) {
          toast.error(r.error);
          setPending(false);
          return;
        }
        // Navegación dura para reflejar la versión restaurada (evita loop soft).
        sessionStorage.setItem(
          'nb3d-publish-toast',
          JSON.stringify({ message: r?.message ?? 'Versión restaurada', warnings: [] }),
        );
        window.location.assign('/admin/design');
      }}
    >
      {pending ? 'Restaurando…' : 'Restaurar'}
    </Button>
  );
}
