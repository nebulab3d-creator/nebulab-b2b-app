'use client';

import { useEffect } from 'react';
import { useFormState } from 'react-dom';
import { toast } from 'sonner';

import {
  resetOwnerPasswordAction,
  setTenantStatusAction,
  type ActionResult,
} from '@/app/(super-admin)/actions';
import { SubmitButton } from '@/components/ui/submit-button';

export const TenantActions = {
  StatusButtons,
  ResetPassword,
};

function StatusButtons({ tenantId, currentStatus }: { tenantId: string; currentStatus: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus !== 'active' && (
        <StatusForm tenantId={tenantId} status="active" label="Reactivar" variant="default" />
      )}
      {currentStatus !== 'suspended' && (
        <StatusForm tenantId={tenantId} status="suspended" label="Suspender" variant="secondary" />
      )}
      {currentStatus !== 'cancelled' && (
        <StatusForm
          tenantId={tenantId}
          status="cancelled"
          label="Cancelar"
          variant="destructive"
          confirm="Marcar este tenant como cancelado? El menú dejará de servirse al comensal."
        />
      )}
    </div>
  );
}

function StatusForm({
  tenantId,
  status,
  label,
  variant,
  confirm,
}: {
  tenantId: string;
  status: 'active' | 'suspended' | 'cancelled';
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
  confirm?: string;
}) {
  const [state, action] = useFormState<ActionResult, FormData>(setTenantStatusAction, null);

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={tenantId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}

function ResetPassword({ userId, email }: { userId: string; email: string }) {
  const [state, action] = useFormState<ActionResult, FormData>(resetOwnerPasswordAction, null);

  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Email enviado');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="ghost" size="sm">
        Reset pwd
      </SubmitButton>
    </form>
  );
}
