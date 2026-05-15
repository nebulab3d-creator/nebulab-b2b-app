import { NewTenantForm } from './new-tenant-form';

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo tenant</h1>
        <p className="text-sm text-muted-foreground">
          Crea el restaurante y su owner inicial. Te mostramos la contraseña temporal una sola vez.
        </p>
      </div>
      <NewTenantForm />
    </div>
  );
}
