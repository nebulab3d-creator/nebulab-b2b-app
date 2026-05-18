'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  updateTenantSettingsAction,
  type ActionResult,
} from '@/app/(admin)/admin/settings/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  MENU_TEMPLATES,
  MENU_TEMPLATE_DESCRIPTIONS,
  MENU_TEMPLATE_LABELS,
  type MenuTemplate,
} from '@/lib/validations/menu';

interface Initial {
  name: string;
  brand_color: string;
  logo_url: string;
  welcome_message: string;
  menu_template: MenuTemplate;
}

export function SettingsForm({ initial }: { initial: Initial }) {
  const [state, action] = useFormState<ActionResult, FormData>(updateTenantSettingsAction, null);

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre comercial</Label>
        <Input id="name" name="name" required defaultValue={initial.name} maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand_color">Color principal (hex)</Label>
        <Input
          id="brand_color"
          name="brand_color"
          defaultValue={initial.brand_color}
          placeholder="#1f2937"
          pattern="^#[0-9a-fA-F]{6}$"
        />
        <p className="text-xs text-muted-foreground">
          Color que aparecerá en botones del comensal. Dejá vacío para usar el default.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo_url">URL del logo</Label>
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={initial.logo_url}
          placeholder="https://…"
        />
        <p className="text-xs text-muted-foreground">
          URL pública de la imagen. Subida directa de archivos viene en próximo sprint.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="welcome_message">Mensaje de bienvenida</Label>
        <textarea
          id="welcome_message"
          name="welcome_message"
          defaultValue={initial.welcome_message}
          rows={3}
          maxLength={280}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Bienvenidos a [restaurante]…"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Plantilla del menú (cómo se ve al comensal)</legend>
        <div className="space-y-2">
          {MENU_TEMPLATES.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-muted/30"
            >
              <input
                type="radio"
                name="menu_template"
                value={t}
                defaultChecked={initial.menu_template === t}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">{MENU_TEMPLATE_LABELS[t]}</div>
                <div className="text-xs text-muted-foreground">{MENU_TEMPLATE_DESCRIPTIONS[t]}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
    </form>
  );
}
