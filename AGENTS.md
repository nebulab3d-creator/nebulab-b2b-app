# AGENTS.md · Contexto para asistentes de IA y devs nuevos

**Leé este archivo ANTES de tocar código.** Contiene el contexto, decisiones tomadas, convenciones y anti-patrones que acumulamos durante el MVP. Está pensado para que cualquier asistente de IA (Claude, Cursor, Codex, Aider…) o dev nuevo pueda contribuir sin romper invariantes ni repetir errores ya cometidos.

**Última revisión:** 2026-05-19 · cubre MVP cerrado (Sprints 1-4) + extensiones ENG-A/B/C + fixes hasta hoy.

---

## 1. Qué es Nebulab3D

**Nebulab3D** es una startup B2B colombiana que vende **centros de mesa impresos en 3D con QR + NFC integrado**, conectados a una plataforma SaaS multi-tenant para restaurantes.

**Para el comensal**: escanea el QR del centro de mesa → ve el menú con fotos, filtros dietéticos y macros → llama al mesero sin levantarse → deja reseña con bonificación al final. Sin descargar app, sin registro, sin pagar nada.

**Para el restaurante**: panel admin web para gestionar menú, mesas, atender llamadas en tiempo real, leer reseñas (con filtro inteligente que separa positivas vs negativas), y ver métricas.

**Para Nebulab3D**: panel super-admin para crear tenants nuevos y dar de alta owners.

Para detalle de producto: ver `docs/MANUAL.md` (manual de usuario), `docs/PITCH-VENTAS.md` (visión comercial), `docs/PERSONALIZACION-MENU.md` (roadmap de UI).

---

## 2. Estado actual del MVP

Cerrado y desplegable. Cubre los RF P0/P1 del PRD:

- **Sprint 1** (ENG-001 a 007): scaffold + auth + super-admin panel + observabilidad (Sentry/PostHog/pino) + Vercel.
- **Sprint 2** (ENG-008 a 011): storage de imágenes + CRUD admin de mesas/QR/menú + comensal webapp con filtros y búsqueda.
- **Sprint 3** (ENG-012 a 015): llamada al mesero con Supabase Realtime + sonido + histórico con métricas.
- **Sprint 4** (ENG-016 a 019): reseñas con bonificación + emisión de código + email Resend + dashboard con CSV export.
- **ENG-A/B/C** (post-Sprint 4): `/admin/menu` rediseñado como acordeón con CRUD inline + 3 plantillas visuales seleccionables (`default`, `compact`, `grid`) + wizard de onboarding obligatorio de 4 pasos.

**Tests**: 28 tests verdes (2 unit + 26 RLS contra cloud Supabase real con seed/cleanup).

**Backlog pendiente**: `docs/BACKLOG.md` con 41 tickets clasificados P0/P1/P2/P3.

---

## 3. Stack — decisiones tomadas (NO cuestionar)

Si algo de esta lista no encaja con lo que querés hacer, **plantealo como pregunta al founder**, no como sugerencia de cambio.

### Frontend

- **Next.js 14** (App Router, RSC, Server Actions). NO Next 15 hasta que migremos explícitamente.
- **TypeScript estricto**: `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`. Sin `any` salvo justificación.
- **Tailwind CSS 4** (CSS-first config en `src/app/globals.css` con bloque `@theme inline`). NO existe `tailwind.config.ts`.
- **shadcn/ui v4** + `@base-ui/react` como primitive layer (NO Radix). Importante: shadcn `Button` no soporta `asChild` (Base UI no tiene Slot). Para wrappear `Link`, usar `buttonVariants()` como className.
- **Tokens de color**: OKLCH CSS vars con dark mode preparado (no implementado todavía).
- **lucide-react** para íconos.
- **sonner** para toasts (Toaster montado en root layout).
- **Inter** vía `next/font/google` como font primaria.

### Backend

- **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions) — un solo proyecto cloud, sin local Docker.
- **Multi-tenancy single-DB**: columna `tenant_id` en cada tabla + RLS policies. NO schema-per-tenant.
- **`@supabase/ssr`** para clients server-side (con cookies). `@supabase/supabase-js` para client browser y para clients dentro de `unstable_cache` (sin cookies).

### Hosting / infra

- **Vercel** (deploy automático, preview por PR).
- **Resend** para emails transaccionales (con fallback no-op si falta API key).
- **Sentry** (errors only en `/admin` y `/super`, NO en `/r/*` por Habeas Data).
- **PostHog** (analytics, solo identificado en `/admin` y `/super`, NO autocapture en comensal).
- **pino** para logs estructurados.

### Validación y forms

- **Zod** schemas en cada boundary (forms, Server Actions, Edge Functions). Reusar entre frontend y backend.
- **React 18 `useFormState` + `useFormStatus`** (NO `useActionState` — eso es React 19/Next 15).
- **`SubmitButton`** compartido en `src/components/ui/submit-button.tsx` — reemplaza el patrón duplicado.

### Testing

- **Vitest** con `jsdom` + `@testing-library`.
- **Tests RLS** corren contra Supabase cloud real con seed/cleanup automático. Skip si faltan env vars (`describe.skipIf(!HAS_ENV)`).
- **`server-only` shim** en `vitest.server-only.shim.ts` (alias en `vitest.config.ts`) para que módulos con `import 'server-only'` no exploten en tests.
- Playwright para E2E NO está implementado — pending en backlog (ENG-203).

### CI/CD

- GitHub Actions: `format:check`, `lint`, `typecheck`, `test:run`, `build`.
- Secrets en GitHub: env vars de Supabase, Sentry, PostHog.

---

## 4. Cómo trabajar acá (reglas no negociables)

### Regla 1 — Architecture before code

Cuando el founder pida implementar una feature del PRD, **primero proponer el approach** (tablas afectadas, endpoints, componentes, flujo) y esperar validación. No empezar a escribir código de inmediato.

> Why: corregir un diseño es barato, refactorizar código no.

### Regla 2 — Estructura de respuesta al implementar

Cuando ya estés implementando, seguí este formato:

1. **Resumen** (1-2 líneas de qué se construye)
2. **Archivos** creados/modificados (lista)
3. **Código** (comentarios solo donde sea no-obvio)
4. **Comandos a ejecutar** (migrations, npm install, etc.)
5. **Cómo probarlo localmente**
6. **Mensaje de commit sugerido** (formato `ENG-XXX: descripción`)

### Regla 3 — Preguntar cuando hay trade-off o ambigüedad

Si dos secciones del PRD se contradicen, si un detalle no está cubierto, o si hay 2+ approaches válidos con consecuencias distintas → preguntar antes. **No hacer assumptions silenciosas.**

### Regla 4 — Simplicidad sobre elegancia (MVP)

Si hay duda entre "solución limpia 3 días" vs "pragmática 1 día", proponer ambas y dejar que el founder decida. No optar unilateralmente por la más completa.

### Regla 5 — Convenciones de código

- **TypeScript estricto**, sin `any` salvo justificación.
- **Server Components por defecto**, Client (`'use client'`) solo cuando se necesite interactividad.
- **Server Actions** para mutaciones (NO route handlers, salvo binary downloads tipo QR.png).
- **Validación Zod** en cada boundary.
- **Naming**: código en inglés, comentarios y commits en español OK.
- **Archivos**: `kebab-case.tsx` · **Componentes**: `PascalCase` · **Funciones**: `camelCase`.
- **Imports**: ordenar con eslint-plugin-import (lo va a flaggear si está mal). Order: builtin → external → internal (`@/...`) → parent → sibling → index.

### Regla 6 — RLS obligatorio

Cada tabla nueva con datos de tenant DEBE incluir:

1. Columna `tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE`.
2. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
3. Policies SELECT/INSERT/UPDATE/DELETE filtradas por `tenant_id` (o `is_super_admin()`).
4. GRANTs explícitos (`GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated`).

**Nunca olvidar.** Un slip en RLS = fuga cross-tenant.

### Regla 7 — Cierre de feature

Al terminar una feature, recordá:

- Qué probar manualmente antes de mergear
- Qué eventos agregar a PostHog (server-side `track('event_name', { ... })`)
- Acumular deuda técnica detectada en una sección "Deuda técnica" del cierre. **NO crear issues en Linear durante el sprint** — el founder consolida y crea al final.

---

## 5. Estructura del proyecto

```
src/
  app/
    (auth)/                       Login, forgot/reset password (sin guard, layout centered)
      login/
      forgot-password/
      reset-password/
      actions.ts                  signIn, signOut, sendResetEmail, etc.
    (admin)/                      Panel del restaurante (guard: tenant user)
      admin/
        layout.tsx                Sidebar + header + LogoutButton · guard
        page.tsx                  Dashboard con métricas
        menu/                     CRUD menú (acordeón + categorías + platos)
        tables/                   CRUD mesas + QR generation (PNG/SVG/ZIP)
        calls/                    Realtime dashboard + history
        reviews/                  Listado con filtros + marcar redimida
        settings/                 (owner only) branding + bonificación + template
        metrics.csv/route.ts      CSV export
    (super-admin)/                Panel interno Nebulab3D (guard: super_admin)
      super/
        tenants/                  Lista, crear, detalle de tenants
    (comensal)/                   Webapp pública sin auth (mobile-first)
      r/[slug]/
        not-found.tsx
        t/[tableId]/
          page.tsx                Carga menu + table + renderiza experiencia
          menu-experience.tsx     Cliente: tabs, filtros, búsqueda, item drawer
          waiter-call-widget.tsx
          review-widget.tsx
          item-detail-drawer.tsx
          track-qr-scan.tsx
    onboarding/                   Wizard 4 pasos (post cambio de password)
      branding/ reviews/ template/ first-table/
      actions.ts
      layout.tsx                  Stepper UI + guards
    change-password/              Top-level (evita loop con admin layout)
    layout.tsx                    Root: Inter font + Toaster
    page.tsx                      Landing pública
    instrumentation.ts            Sentry server/edge boot
  components/
    ui/                           shadcn primitives (Button, Card, Input, …) + customs (Spinner, SubmitButton, Expandable)
    auth/logout-button.tsx
    analytics/posthog-provider.tsx
  lib/
    auth/                         get-current-user (cached), require-tenant, onboarding helpers, types, redirects
    supabase/                     client (browser), server (RSC/Actions con cookies), admin (service_role), cacheable (anon sin cookies), env (lazy), database.types
    comensal/                     queries (con unstable_cache), analytics (client tracking)
    super-admin/                  provision (atomic create tenant+owner), passwords, auth-guard
    metrics/                      dashboard aggregation
    reviews/                      bonus-code generation
    email/                        send-bonus (Resend no-op fallback)
    storage/                      menu-images upload/delete
    qr/                           generate (qrcode lib wrapper)
    validations/                  Zod schemas (auth, menu, reviews, tables, waiter-calls, super-admin)
    logger.ts                     pino (pretty dev, JSON prod)
  middleware.ts                   Refresh session + route guards (sin DB query)
supabase/migrations/              SQL migrations (formato `YYYYMMDDHHMMSS_name.sql`)
scripts/create-super-admin.ts     CLI tool
docs/                             MANUAL, PITCH-VENTAS, PERSONALIZACION-MENU, BACKLOG
sentry.{client,server,edge}.config.ts
```

---

## 6. Arquitectura

### Multi-tenancy

- **Single database, multi-tenant por `tenant_id`** con RLS policies.
- Cada tenant tiene rows separadas en cada tabla; RLS las aisla automáticamente.
- **3 roles dentro del tenant**: `owner` (todo), `manager` (todo excepto users + settings), `staff` (solo waiter_calls).
- **Rol externo Nebulab3D**: `super_admin` en tabla aparte `super_admins`. Acceso cross-tenant via `is_super_admin()` helper.

### Route groups (sin URL prefix)

- `(auth)` — `/login`, `/forgot-password`, `/reset-password`
- `(admin)` — `/admin`, `/admin/*`
- `(super-admin)` — `/super`, `/super/*`
- `(comensal)` — `/r/[slug]/t/[tableId]`
- `change-password/` y `onboarding/` son top-level (NO en grupo) para evitar loops con guards de `(admin)`.

### Auth flow

1. Middleware refresca sesión via cookies en cada request.
2. Middleware redirige `/admin`, `/super`, `/change-password`, `/onboarding` sin sesión → `/login?next=<path>`.
3. Middleware redirige `/login`, `/forgot-password` con sesión → `/admin`.
4. Layouts protegidos ejecutan `getCurrentUser()` (cached via `React.cache`) que devuelve `{ kind: 'tenant' | 'super', auth, profile?, tenant?, role? }`.
5. `(admin)/admin/layout.tsx` redirige:
   - `kind === 'super'` → `/super`
   - `must_change_password === true` → `/change-password`
   - `onboarded_at === null` → `/onboarding`
6. `(super-admin)/super/layout.tsx` redirige `kind !== 'super'` → `/admin`.

### Realtime

- Supabase Realtime habilitado en `waiter_calls` (migración ENG-003).
- Cliente subscribe con filtro `tenant_id=eq.<id>` (staff) o `id=eq.<call_id>` (comensal).
- Latency objetivo PRD: <2s.

### Caching

- `unstable_cache(...)` en `getPublicMenuCached(slug)` con tag `tenant-menu-by-slug:<slug>`, revalidate 60s.
- Server Actions del admin que modifican menú llaman `revalidateTag(`tenant-menu:${tenantId}`)` y `revalidateTag(`tenant-menu-by-slug:${slug}`)`.
- **CRÍTICO**: dentro de `unstable_cache(...)` NO usar el client con cookies. Usar `createCacheableAnonClient()` (ver anti-patrón #4).

### Comensal (anon)

- URL: `/r/[slug]/t/[tableId]` — sin login, sin registro.
- Lee menú vía RLS de `anon` (policies que filtran por `active=true`/`available=true`).
- Escribe en `waiter_calls`, `reviews`, `analytics_events` vía RLS de `anon` + triggers `set_tenant_id_from_table` (derivan `tenant_id` desde `table_id` para que anon NO pueda spoofear).

---

## 7. Database — modelo y helpers

### Tablas core

```
tenants(id, slug UNIQUE, name, plan, status CHECK(active|suspended|cancelled), settings JSONB, ...)
super_admins(id PK REFERENCES auth.users, created_at)
users(id PK REFERENCES auth.users, tenant_id FK, role CHECK(owner|manager|staff),
      full_name, email, must_change_password, ...)

menu_categories(id, tenant_id, name, position, active, ...)
menu_items(id, tenant_id, category_id, name, description, price DECIMAL,
           image_url, ingredients TEXT[], dietary_tags TEXT[], macros JSONB,
           available, position, ...)
tables(id, tenant_id, number UNIQUE(tenant_id,number), active, ...)
                                     -- URL del QR usa tables.id directamente

waiter_calls(id, tenant_id, table_id, status CHECK(pending|acknowledged|resolved),
             reason, created_at, acknowledged_at, resolved_at, resolved_by)
             -- UNIQUE INDEX parcial: max 1 activa por mesa
reviews(id, tenant_id, table_id, rating CHECK(1..5), comment, customer_name,
        customer_contact, is_public, bonus_sent, bonus_code, redeemed_at, ...)
analytics_events(id, tenant_id, table_id, event_type, event_data JSONB, session_id, ...)
                                                                       -- append-only
```

### Funciones helper (todas `SECURITY DEFINER SET search_path = public`)

```sql
current_tenant_id() RETURNS UUID    -- (SELECT tenant_id FROM users WHERE id = auth.uid())
is_super_admin()    RETURNS BOOLEAN -- EXISTS en super_admins
current_user_role() RETURNS TEXT    -- 'owner'|'manager'|'staff'
is_owner_or_manager() RETURNS BOOLEAN
validate_table_id(uuid) RETURNS UUID -- valida + devuelve tenant_id, lanza si inválido
handle_updated_at()                  -- trigger reusable para columna updated_at
set_tenant_id_from_table()           -- trigger BEFORE INSERT en waiter_calls/analytics
review_before_insert()               -- trigger BEFORE INSERT en reviews
```

### Settings JSONB del tenant

`tenants.settings` es JSONB libre. Convenciones de claves:

```jsonc
{
  "brand_color": "#dc2626",
  "logo_url": "https://...",
  "welcome_message": "...",
  "menu_template": "default" | "compact" | "grid",
  "bonification": { "type", "value", "copy", "conditions", "expiry_days" },
  "google_place_id": "ChIJ...",
  "review_public_threshold": 4,
  "onboarded_at": "2026-05-18T..."
}
```

Schemas Zod en `lib/validations/menu.ts` y `lib/validations/reviews.ts`.

### RLS — pattern obligatorio

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_select_same_tenant_or_super
  ON public.<table> FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id = public.current_tenant_id());

-- Para anon (si aplica):
CREATE POLICY <table>_anon_select_X
  ON public.<table> FOR SELECT TO anon
  USING (<condición>);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT SELECT ON public.<table> TO anon;  -- si tiene policy anon
```

---

## 8. Patrones core

### Server Actions

Estructura:

```ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireTenantUser } from '@/lib/auth/require-tenant';
import { createClient } from '@/lib/supabase/server';
import { schema } from '@/lib/validations/...';

export type ActionResult = { ok: false; error: string } | { ok: true; message?: string } | null;

export async function myAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireTenantUser(['owner', 'manager']); // o sin roles
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(' · ') };

  const supabase = createClient();
  const { error } = await supabase
    .from('table')
    .insert({ ...parsed.data, tenant_id: me.tenant.id });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/...');
  revalidateTag(`tenant-...:${me.tenant.id}`);
  return { ok: true, message: 'Listo' };
}
```

Para super-admin actions: usar `assertSuperAdmin()` + `createAdminClient()` (service_role).

### Forms con feedback de loading

```tsx
'use client';
import { useFormState } from 'react-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/submit-button';
import { myAction, type ActionResult } from './actions';

export function MyForm() {
  const [state, action] = useFormState<ActionResult, FormData>(myAction, null);
  useEffect(() => {
    if (state?.ok === true) toast.success(state.message ?? 'Listo');
    if (state?.ok === false) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      {/* fields */}
      <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
    </form>
  );
}
```

### Realtime subscriptions

```tsx
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel(`waiter-calls-${tenantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'waiter_calls', filter: `tenant_id=eq.${tenantId}` },
      (payload) => {
        /* handle */
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}, [tenantId]);
```

### Tracking de eventos (comensal)

```ts
import { trackComensalEvent } from '@/lib/comensal/analytics';
void trackComensalEvent({ tableId, event: 'item_view', data: { item_id: it.id } });
```

Eventos válidos: `qr_scan`, `menu_loaded`, `item_view`, `filter_used`, `search_used`, `waiter_call`, `review_submitted`. Best-effort (no rompe UI si falla).

---

## 9. Anti-patrones (aprendidos a la mala — no repetir)

### Anti-patrón #1 — Policies RLS que consultan la propia tabla protegida

NO escribir policies que hagan `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND ...)` directamente sobre la tabla `users`. Genera recursión.

**Patrón correcto**: usar los helpers `current_tenant_id()`, `is_super_admin()`, `current_user_role()` que son `SECURITY DEFINER` y rompen el ciclo.

### Anti-patrón #2 — `.insert(...).select()` desde anon

Cuando hacés `await anonClient.from('reviews').insert(...).select()` y la fila resultante NO satisface la policy de SELECT de anon (ej: `is_public=false`, o `analytics_events` que no tiene anon SELECT), PostgREST tira `42501 row-level security policy violation`. El INSERT en sí pasó, pero el RETURNING aplica RLS de SELECT.

**Patrón correcto**: después de INSERT anon, NO encadenar `.select()`. Confirmar con `error === null` y listo. Si necesitás verificar el resultado (en tests), leer con admin client.

### Anti-patrón #3 — Self-update de `users` desde rol no-owner via cliente normal

La policy `users_update_owner_or_super` solo permite UPDATE a `owner`. Un staff o manager NO puede modificar su propia row (ej: bajar `must_change_password`).

**Patrón correcto**: para self-updates de campos no-críticos por usuarios sin rol owner, usar `createAdminClient()` (service_role) en el Server Action, con auth ya verificada arriba. Aplica a `must_change_password`, futuras prefs personales.

**Mejor para post-MVP**: RPC `SECURITY DEFINER` que solo permite tocar columnas seguras (ver backlog ENG-208).

### Anti-patrón #4 — `cookies()` dentro de `unstable_cache(...)`

NO usar `createClient()` de `lib/supabase/server.ts` adentro de funciones cacheadas. Ese client llama `cookies()` de `next/headers`, que es fuente dinámica → Next 14 lo prohíbe:

> "Accessing Dynamic data sources inside a cache scope is not supported"

**Patrón correcto**: dentro de funciones cacheadas, usar `createCacheableAnonClient()` (de `lib/supabase/cacheable.ts`) para reads anon, o `createAdminClient()` para reads que requieren bypass RLS. El cookies-based server client se reserva para Server Components/Actions que NO viven adentro de `unstable_cache`.

### Anti-patrón #5 — env validation eager

NO hacer `export const env = schema.parse({...})` a nivel de módulo. Si Vercel hace "collect page data" sin las env vars (o con env vars de otro environment), explota el build con "Invalid input".

**Patrón correcto**: lazy + cached:

```ts
let cached: Env | null = null;
export function getEnv(): Env {
  if (!cached) cached = schema.parse({...});
  return cached;
}
```

Ver `lib/supabase/env.ts` como referencia.

### Anti-patrón #6 — Habeas Data: tracking del comensal a third parties

PRD §RNF-2 invoca Ley 1581 (Habeas Data). El comensal anon (`/r/*`) NO debe mandar datos a Sentry ni a PostHog sin consentimiento explícito.

**Patrón correcto**:

- Sentry: `beforeSend` dropea eventos con URL `/r/*`.
- PostHog: el provider está montado SOLO en `(admin)` y `(super-admin)` layouts, no en root.
- Eventos del comensal van solo a nuestra tabla `analytics_events`.

---

## 10. Workflows comunes

### Cómo agregar una migración nueva

1. Crear archivo con timestamp: `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`.
2. SQL en español-friendly: incluir tabla + RLS habilitado + policies + GRANTs + índices + triggers.
3. Aplicar a cloud: `npx supabase db push` (asume `supabase link` ya hecho con `dyarfrecbhciygriqyuf`).
4. Regenerar tipos TS: `bash -c "cd <repo> && npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts"`.
   ⚠️ Usar **bash** no PowerShell para el redirect — PowerShell escribe en UTF-16 y rompe el archivo.
5. Si tocaste algo público del schema, actualizar `lib/validations/` con el Zod schema correspondiente.

### Cómo agregar una página al admin

1. Decidir route group: `(admin)` (tenant user), `(super-admin)` (super), `(auth)` (sin auth).
2. Crear `src/app/(<group>)/<path>/page.tsx` server component.
3. Si necesita data del usuario actual: `const me = await requireTenantUser(['owner', 'manager']?)` o `await assertSuperAdmin()`.
4. Si necesita queries: `const supabase = createClient()`.
5. Si requiere interactividad: extraer a un cliente component separado (`<path>/<page>-form.tsx` o `<page>-actions.tsx`).
6. Agregar link en el sidebar correspondiente (`admin/layout.tsx` o `super/layout.tsx`).
7. Si tiene loading lento: crear `loading.tsx` en el segmento con skeleton.

### Cómo agregar una Server Action

1. Crear/usar `src/app/(<group>)/<path>/actions.ts` con `'use server';` al tope.
2. Pattern de la sección 8.
3. Validación Zod siempre.
4. `requireTenantUser(roles)` o `assertSuperAdmin()` al inicio.
5. RLS hace el filtrado real — la action NO repite checks de tenant_id en queries (solo agrega `tenant_id` en INSERTs).
6. `revalidatePath` y/o `revalidateTag` al final si los datos se cachean.

### Cómo agregar un evento de tracking

- **Comensal (anon)**: `trackComensalEvent({ tableId, event: 'X', data: { ... } })` — best-effort, va a `analytics_events`.
- **Admin (autenticado)**: TBD — helper `track(...)` server-side está en backlog (ENG-207). Por ahora, `logger.info({ event: 'X', tenant_id: ..., ... }, 'descripción')`.

### Cómo agregar un test RLS

Patrón en `src/lib/supabase/rls.test.ts` o `rls-menu.test.ts`:

1. `describe.skipIf(!HAS_ENV)` para skipear sin env vars.
2. `beforeAll`: seed 2 tenants + users con tag random.
3. `afterAll`: cleanup (delete auth users → cascadea a `public.users`; delete tenants → cascadea al resto).
4. Tests: signin como tenant A, intentar leer/escribir datos de tenant B → debería fallar o devolver 0 rows.

### Cómo hacer un fix de bug

1. Reproducir el bug en local.
2. Si toca RLS o schema: probar primero en `nebulab3d-dev` (cuando exista) o staging.
3. Escribir test que reproduce el bug.
4. Fix.
5. Test verde + el resto sigue verde.
6. Commit con `fix(scope): descripción`.

---

## 11. Comandos

```powershell
# Dev
npm run dev                                  # localhost:3000
npm run build                                # build prod (verifica antes de PR)
npm run typecheck                            # tsc --noEmit
npm run lint                                 # next lint
npm run lint:fix                             # autofix
npm run format                               # prettier write
npm run format:check                         # prettier check
npm run test                                 # vitest watch
npm run test:run                             # vitest run (single)
npm run test:coverage                        # con coverage

# Supabase
npx supabase db push                         # aplica migrations pendientes a cloud linked
npx supabase gen types typescript --linked   # ⚠️ redirigir con bash, no PS
npx supabase migration new <nombre>          # crea archivo con timestamp

# Super admin
npm run seed:super-admin -- --email <email> --password <password>

# Shadcn
npx shadcn@latest add <component>            # agrega un primitive
```

---

## 12. Archivos que NUNCA tocar (o leer antes)

- **`supabase/migrations/*.sql`** — append-only por convención. NUNCA modificar una migración ya aplicada en prod. Crear una nueva que revierta/ajuste.
- **`src/lib/supabase/database.types.ts`** — auto-generated. NO editar a mano. Regenerar con `supabase gen types`.
- **`src/components/ui/*.tsx`** — shadcn-generated. Si necesitás cambios, hacelos pero documentá (algunos archivos ya tienen fixes de import order respecto al template original).
- **`.env.local`** — gitignored. NUNCA pegar credenciales reales en `.env.local.example` (lección aprendida — ver incident ENG-101).
- **`tenants.id`** de tenants reales — NO cambiar UUIDs en prod. Si necesitás migrar, hacer doble insert + delete.

---

## 13. Referencias

Documentos en `docs/`:

| Archivo                     | Para qué                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **MANUAL.md**               | Manual de usuario para clientes (super-admins, owners, managers, staff, comensal). Lo entregamos post-venta.        |
| **PITCH-VENTAS.md**         | Guía operativa para vender. Pitch en 3 longitudes, casos prácticos, manejo de objeciones. Audience: founders/sales. |
| **PERSONALIZACION-MENU.md** | Roadmap de cuán lejos llevar la personalización del menú. 5 tiers de opciones.                                      |
| **BACKLOG.md**              | 41 tickets pendientes clasificados P0/P1/P2/P3 + roadmap mes a mes. Listo para Linear/Notion.                       |

Adicionalmente:

- **PRD del MVP** (no está en el repo todavía — pedirlo al founder si necesitás).
- **README.md** — setup técnico, scripts, estructura. Pendiente de mejora (backlog ENG-211).

---

## 14. Glosario

| Término                     | Significado                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant**                  | Un restaurante cliente del SaaS. Datos aislados por `tenant_id` + RLS.                                                                            |
| **Owner / Manager / Staff** | Roles dentro de un tenant. Owner es admin total, manager casi todo, staff solo waiter_calls.                                                      |
| **Super-admin**             | Equipo interno Nebulab3D. Vive en tabla `super_admins`, acceso cross-tenant.                                                                      |
| **Comensal**                | Cliente final del restaurante. Anónimo, sin login. Accede vía `/r/[slug]/t/[tableId]`.                                                            |
| **Slug**                    | URL-friendly identifier de un tenant. Único. Usado en `/r/[slug]/...`.                                                                            |
| **RLS**                     | Row Level Security de Postgres. Mecanismo de aislamiento tenant.                                                                                  |
| **Bonificación**            | Premio que el restaurante ofrece a comensales que dejan reseña (descuento, postre gratis, etc.).                                                  |
| **Template del menú**       | Layout visual con el que se renderiza el menú al comensal. 3 opciones: `default`, `compact`, `grid`. Configurable en `settings.menu_template`.    |
| **Onboarding wizard**       | Flujo obligatorio de 4 pasos para owner recién creado: branding → reviews → template → primera mesa. Se enforza con flag `settings.onboarded_at`. |
| **PRD**                     | Product Requirements Document. Fuente de verdad del scope MVP.                                                                                    |
| **ENG-XXX**                 | Issue ID provisional (formato del backlog). Cuando Linear asigne IDs reales, reemplazar.                                                          |

---

## Notas finales para asistentes de IA

- **Tono al founder**: directo, pragmático, sin pelo en la lengua. Llamá a los problemas por su nombre. Si una decisión es mala, decilo, no la endorses.
- **Preguntá cuando dudes** (Regla 3) — preferible perder 30s a equivocarse 3 horas.
- **El founder usa Windows + PowerShell + WSL/Git Bash** — comandos POSIX con `bash`, comandos nativos en `PowerShell`. Para redirects de stdout que escriben archivos (ej: `supabase gen types`), siempre usar bash.
- **Memorias del proyecto**: si tenés acceso a un sistema de memoria persistente entre conversaciones, las decisiones load-bearing ya están guardadas (`user-role.md`, `feedback-collaboration-style.md`, `project-nebulab3d.md`, `reference-external-systems.md`). Cuando se agregue una nueva decisión arquitectónica importante, actualizalas.
- **Stack pinneado**: cualquier upgrade de versión major (Next 15, React 19, Tailwind 5) es un proyecto aparte, no se cuela en un PR de feature.

---

_AGENTS.md · Nebulab3D · mantenido por humanos+IA · actualizar cuando una decisión nueva afecte cómo se trabaja acá_
