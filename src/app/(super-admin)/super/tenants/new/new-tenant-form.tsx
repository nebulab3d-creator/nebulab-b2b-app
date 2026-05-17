'use client';

import Link from 'next/link';
import { useFormState } from 'react-dom';

import { createTenantWithOwnerAction } from '@/app/(super-admin)/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ProvisionResult } from '@/lib/super-admin/provision';

export function NewTenantForm() {
  const [state, action] = useFormState<ProvisionResult | null, FormData>(
    createTenantWithOwnerAction,
    null,
  );

  if (state?.ok === true) {
    return <Created result={state} />;
  }

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre comercial</Label>
            <Input id="name" name="name" required maxLength={80} placeholder="Pizza Pepe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={40}
              placeholder="pizza-pepe"
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              title="minúsculas, números y guiones"
            />
            <p className="text-xs text-muted-foreground">
              URL del comensal: <code>/r/&lt;slug&gt;/t/&lt;table-id&gt;</code>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <select
              id="plan"
              name="plan"
              defaultValue="basic"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="basic">basic</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Owner inicial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner_full_name">Nombre completo</Label>
            <Input id="owner_full_name" name="owner_full_name" required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_email">Email</Label>
            <Input id="owner_email" name="owner_email" type="email" required />
            <p className="text-xs text-muted-foreground">
              Le generamos una contraseña temporal — la mostramos una sola vez después de crear.
            </p>
          </div>
        </CardContent>
      </Card>

      {state?.ok === false && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link href="/super/tenants">
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </Link>
        <SubmitButton pendingLabel="Creando…">Crear tenant + owner</SubmitButton>
      </div>
    </form>
  );
}

function Created({ result }: { result: Extract<ProvisionResult, { ok: true }> }) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>✓ Tenant creado</AlertTitle>
        <AlertDescription>
          Compartile estas credenciales al owner por canal seguro (Slack, llamada). NO se mostrarán
          de nuevo. Al primer login va a estar forzado a cambiar la contraseña.
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Field label="Email" value={result.owner_email} />
          <Separator />
          <Field label="Contraseña temporal" value={result.temp_password} mono />
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2">
        <Link href="/super/tenants">
          <Button variant="ghost">Volver a tenants</Button>
        </Link>
        <Link href={`/super/tenants/${result.tenant_id}`}>
          <Button>Ver detalle del tenant</Button>
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <code className={`rounded bg-muted px-2 py-1 text-sm select-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </code>
    </div>
  );
}
