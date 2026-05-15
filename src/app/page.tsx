import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Nebulab3D</h1>
      <p className="text-balance text-muted-foreground">
        Plataforma para restaurantes — menú interactivo, llamada al mesero y reseñas con
        bonificación.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/admin" className={buttonVariants({ size: 'lg' })}>
          Panel del restaurante
        </Link>
        <Link href="/super" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          Super-admin
        </Link>
      </div>
    </main>
  );
}
