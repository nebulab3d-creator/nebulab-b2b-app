'use client';

import { useEffect, useState } from 'react';
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

import { TemplatePreview } from './template-preview';

export function TemplateStepForm({ initial }: { initial: MenuTemplate }) {
  const [state, action] = useFormState<ActionState, FormData>(submitTemplateStep, null);
  const [selected, setSelected] = useState<MenuTemplate>(initial);

  useEffect(() => {
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      {/* Preview Visual */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-gray-900">
          Elige cómo se verá tu menú:
        </label>
        <TemplatePreview
          selected={selected}
          onSelect={(template) => {
            setSelected(template);
            document.querySelector<HTMLInputElement>(
              `input[name="menu_template"][value="${template}"]`,
            )!.checked = true;
          }}
        />
      </div>

      {/* Radio inputs (hidden, updated by preview clicks) */}
      <fieldset className="sr-only">
        <legend>Plantilla del menú</legend>
        {MENU_TEMPLATES.map((t) => (
          <input
            key={t}
            type="radio"
            name="menu_template"
            value={t}
            defaultChecked={initial === t}
            required
          />
        ))}
      </fieldset>

      {/* Description */}
      <div className="rounded-lg bg-blue-50 p-3">
        <div className="text-xs font-semibold text-blue-900">{MENU_TEMPLATE_LABELS[selected]}</div>
        <div className="mt-1 text-xs text-blue-800">{MENU_TEMPLATE_DESCRIPTIONS[selected]}</div>
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton pendingLabel="Guardando…">Continuar →</SubmitButton>
      </div>
    </form>
  );
}
