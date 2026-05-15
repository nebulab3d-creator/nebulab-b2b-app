# Nebulab3D — B2B SaaS

Plataforma multi-tenant para restaurantes en Colombia. Comensales escanean QR de los centros de mesa Nebulab3D, exploran menú interactivo, llaman al mesero y dejan reseñas con bonificación. Restaurantes gestionan menú, atienden llamadas en tiempo real y revisan métricas desde un panel admin.

## Stack

Next.js 14 (App Router, RSC) · TypeScript estricto · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) · Resend · Sentry · PostHog · Vercel

## Setup

```bash
npm install
cp .env.local.example .env.local   # rellenar credenciales
npm run dev
```

Abrí http://localhost:3000

## Scripts

| Script                            | Acción                    |
| --------------------------------- | ------------------------- |
| `npm run dev`                     | dev server                |
| `npm run build`                   | build prod                |
| `npm run lint` / `lint:fix`       | eslint                    |
| `npm run typecheck`               | `tsc --noEmit`            |
| `npm run test` / `test:run`       | vitest watch / single run |
| `npm run format` / `format:check` | prettier                  |

## Estructura

```
src/app/
  (comensal)/      webapp del comensal (sin auth, mobile-first)
  (admin)/         panel del restaurante (auth + tenant scope)
  (super-admin)/   panel interno Nebulab3D
src/lib/           utilidades, Supabase clients, validaciones Zod
src/components/    componentes compartidos (ui/ es shadcn)
supabase/migrations/
```

## Convenciones

- Branches: `feature/ENG-XXX-descripcion` · `fix/ENG-XXX-descripcion`
- Commits: `ENG-XXX: descripción` (Linear auto-vincula)
- PRs requieren code review antes de merge a `main`
- TypeScript estricto: prohibido `any` salvo justificación
- Server Components por defecto, Client solo cuando se necesite interactividad
- Server Actions para mutaciones
- Validación Zod en cada boundary (forms, API, edge functions)

## Más

PRD del MVP: `docs/PRD.md` · ADRs: `docs/adr/`
