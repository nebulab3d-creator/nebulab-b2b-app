'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import { SubmitButton } from '@/components/ui/submit-button';
import {
  MENU_TEMPLATES,
  MENU_TEMPLATE_DESCRIPTIONS,
  MENU_TEMPLATE_LABELS,
  type MenuTemplate,
} from '@/lib/validations/menu';

import { submitTemplateStep, type ActionState } from '../actions';

export function TemplateStepForm({ initial }: { initial: MenuTemplate }) {
  const [state, action] = useFormState<ActionState, FormData>(submitTemplateStep, null);

  useEffect(() => {
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Plantilla del menú</legend>
        {MENU_TEMPLATES.map((t) => (
          <label
            key={t}
            className="flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-muted/30"
          >
            <input
              type="radio"
              name="menu_template"
              value={t}
              defaultChecked={initial === t}
              className="mt-1"
              required
            />
            <div className="flex-1 space-y-1">
              <div className="text-sm font-medium">{MENU_TEMPLATE_LABELS[t]}</div>
              <div className="text-xs text-muted-foreground">{MENU_TEMPLATE_DESCRIPTIONS[t]}</div>
            </div>
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Guardando…">Continuar →</SubmitButton>
      </div>
    </form>
  );
}
