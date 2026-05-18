'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

import { submitBrandingStep, type ActionState } from '../actions';

interface Initial {
  name: string;
  brand_color: string;
  logo_url: string;
  welcome_message: string;
}

export function BrandingStepForm({ initial }: { initial: Initial }) {
  const [state, action] = useFormState<ActionState, FormData>(submitBrandingStep, null);

  useEffect(() => {
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre comercial</Label>
        <Input id="name" name="name" defaultValue={initial.name} required maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand_color">Color principal (opcional)</Label>
        <Input
          id="brand_color"
          name="brand_color"
          defaultValue={initial.brand_color}
          placeholder="#1f2937"
          pattern="^#[0-9a-fA-F]{6}$"
        />
        <p className="text-xs text-muted-foreground">Hex, ej: #dc2626. Vacío = usa el default.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo_url">URL del logo (opcional)</Label>
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={initial.logo_url}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="welcome_message">Mensaje de bienvenida (opcional)</Label>
        <textarea
          id="welcome_message"
          name="welcome_message"
          defaultValue={initial.welcome_message}
          rows={2}
          maxLength={280}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Bienvenidos a [restaurante]…"
        />
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Guardando…">Continuar →</SubmitButton>
      </div>
    </form>
  );
}
