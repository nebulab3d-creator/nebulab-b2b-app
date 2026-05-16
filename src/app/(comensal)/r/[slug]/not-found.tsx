import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Restaurante no encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El QR puede estar desactualizado o el restaurante puede haber suspendido el servicio.
      </p>
      <Link href="/" className="mt-6 text-sm underline">
        Volver al inicio
      </Link>
    </div>
  );
}
