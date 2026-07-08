'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DESIGN_PRESET_DESCRIPTIONS,
  DESIGN_PRESET_LABELS,
  DESIGN_PRESETS,
  type DesignPreset,
} from '@/lib/design/presets';

import { createDraftFromPresetAction } from './actions';

export function PresetPicker() {
  const [preset, setPreset] = useState<DesignPreset>(DESIGN_PRESETS[0]);
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    const r = await createDraftFromPresetAction(preset);
    if (r?.ok === false) {
      toast.error(r.error);
      setCreating(false);
      return;
    }
    // Navegación dura a la misma ruta: monta el editor de forma fiable. Evita el
    // refetch-storm que produce la transición soft (RSC) tras crear el borrador.
    window.location.assign('/admin/design');
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DESIGN_PRESETS.map((p) => (
          <label
            key={p}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors has-checked:border-primary has-checked:bg-muted/40"
          >
            <input
              type="radio"
              name="preset"
              value={p}
              checked={preset === p}
              onChange={() => setPreset(p)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold">{DESIGN_PRESET_LABELS[p]}</span>
              <span className="block pt-0.5 text-xs text-muted-foreground">
                {DESIGN_PRESET_DESCRIPTIONS[p]}
              </span>
            </span>
          </label>
        ))}
      </div>
      <Button onClick={() => void create()} disabled={creating}>
        {creating ? 'Creando…' : 'Crear borrador con esta plantilla'}
      </Button>
    </div>
  );
}
