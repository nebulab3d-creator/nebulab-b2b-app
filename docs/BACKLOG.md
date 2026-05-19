# Backlog · Tareas pendientes consolidadas

Inventario completo de deuda técnica, features de post-MVP, tareas operativas y bugs conocidos acumulados durante Sprints 1-4 + ENG-A/B/C. Formato pensado para copiar a Linear o Notion.

**Última revisión:** 2026-05-18 · MVP funcional cerrado.

---

## Resumen ejecutivo

| Prioridad | Cantidad | Definición                                                                                    |
| --------- | -------- | --------------------------------------------------------------------------------------------- |
| **P0**    | 5        | Bloqueador / riesgo de seguridad / compliance. Hacer ANTES de onboardear primer cliente real. |
| **P1**    | 11       | Crítico para calidad de producción. Hacer durante el primer mes.                              |
| **P2**    | 14       | Mejora de UX / DX significativa. Hacer en los primeros 3 meses.                               |
| **P3**    | 11       | Nice-to-have. Hacer cuando haya bandwidth o cuando un cliente lo pida.                        |
| **Total** | **41**   |                                                                                               |

**Esfuerzo agregado** (estimación gruesa): ~12-16 semanas-persona si se hicieran todos secuencialmente. Realistas: priorizar P0+P1, ejecutar P2 selectivo según feedback de clientes reales.

---

## Cómo usar este backlog

### Para importar a Linear

1. Creá un proyecto "Nebulab3D MVP — Deuda y backlog post-MVP".
2. Por cada ticket: copiá el `### ENG-XXX · Título` como title y el resto del bloque como description.
3. Setteá la prioridad según la P0/P1/P2/P3.
4. Asigná labels según la categoría (`security`, `dx`, `ux`, `obs`, `feature`, `test`, `ops`, `docs`).
5. El ID `ENG-XXX` es provisional — cuando Linear le asigne su propio número, actualizá el commit convention (`ENG-XXX:` → el real).

### Para usar como Notion database

Creá una database con columnas: `ID`, `Título`, `Prioridad`, `Categoría`, `Esfuerzo`, `Sprint origen`, `Status`. Cada bloque de abajo es una row.

### Prioridades

- **P0** — bloquea ship o crea riesgo real. Hacer YA.
- **P1** — el producto funciona sin esto pero no debería estar en prod sin esto por mucho tiempo (≤30 días).
- **P2** — mejora significativa que vale la pena planificar. Sin urgencia mensual.
- **P3** — backlog largo. Hacer cuando un cliente concreto lo pida o cuando aparezca bandwidth.

### Esfuerzo

- **S** (Small) — ≤1 día
- **M** (Medium) — 1-3 días
- **L** (Large) — 3-7 días (1 semana)
- **XL** (Extra Large) — más de 1 semana

---

# P0 · Bloqueadores y seguridad (5 tickets)

Hacer ANTES de onboardear el primer cliente real. Si alguno queda abierto, no firmes contratos.

---

### ENG-101 · Rotar SUPABASE_SERVICE_ROLE_KEY (post-incidente env.example)

**Categoría**: `security`
**Priority**: P0
**Effort**: S
**Sprint origen**: ENG-002 (incidente del 2026-05-14)

#### Problema / Contexto

Durante ENG-002 el usuario pegó accidentalmente las credenciales reales de Supabase en `.env.local.example` (que se versiona) en vez de `.env.local`. Aunque se detectó antes del commit, las credenciales quedaron en el historial de chat con la IA (servidores Anthropic) y momentáneamente en disco. La `service_role` bypassea RLS — el impacto de una fuga es total.

#### Scope

- [ ] Andar a Supabase Dashboard → Settings → API → Reset `service_role` key.
- [ ] Copiar la nueva key.
- [ ] Actualizar `.env.local` local.
- [ ] Actualizar en Vercel → Environment Variables (Production + Preview + Development).
- [ ] Actualizar en GitHub Secrets para CI.
- [ ] Re-deploy en Vercel para que tome la nueva key.

#### Acceptance criteria

- La key vieja deja de funcionar (probá usándola en un script y debería tirar 401).
- La key nueva funciona en local, preview y prod.

#### Notas

- También sería buen momento de rotar `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SENTRY_AUTH_TOKEN` si pasaron por canales no seguros.

---

### ENG-102 · Crear proyecto Supabase `nebulab3d-dev` separado

**Categoría**: `security`, `ops`
**Priority**: P0
**Effort**: M
**Sprint origen**: ENG-002 (decisión diferida)

#### Problema / Contexto

Hoy todos los environments (dev local, preview, prod) apuntan al mismo proyecto Supabase. Los tests RLS automáticos crean y borran tenants/users en CADA corrida de CI. Cuando haya clientes reales, esto va a contaminar prod con datos de test y crear riesgo de borrar prod por error.

#### Scope

- [ ] Crear nuevo proyecto Supabase llamado `nebulab3d-dev` en la misma org.
- [ ] Copiar el `supabase/migrations/` y correr `supabase db push --project-ref <new-ref>` para clonar el schema.
- [ ] Actualizar `.env.local` para apuntar al nuevo proyecto en local dev.
- [ ] Actualizar GitHub Secrets para que CI use el nuevo proyecto (Preview env-vars de Vercel también).
- [ ] Mantener el proyecto original (`dyarfrecbhciygriqyuf`) solo para Production en Vercel.
- [ ] Documentar el flow: "PR contra dev → preview deploy → merge a main → prod" en README.

#### Acceptance criteria

- `npm run test:run` no crea ni borra datos en el proyecto de prod.
- Local dev apunta a `nebulab3d-dev`.
- Vercel Production usa el proyecto original; Preview usa el de dev.

#### Notas

- Considerá si querés sumar también `nebulab3d-staging` para tener 3 ambientes (dev, staging, prod). Para MVP con 2 alcanza.

---

### ENG-103 · Verificar dominio en Resend para emails de producción

**Categoría**: `security`, `compliance`
**Priority**: P0
**Effort**: M
**Sprint origen**: ENG-017 (Sprint 4)

#### Problema / Contexto

Hoy los emails de bonificación se envían desde `onboarding@resend.dev` (default del SDK). Esto se ve mal al cliente final, baja la deliverability (más spam), y en algunos dominios (Outlook, corporativos) directamente se bloquea.

#### Scope

- [ ] Comprar/verificar dominio `nebulab3d.com` (o el que tengas) en Resend → https://resend.com/domains.
- [ ] Agregar los registros DNS (SPF, DKIM, MX si aplica) en tu proveedor de DNS.
- [ ] Esperar verificación (~15 min a 24h).
- [ ] Configurar `RESEND_FROM = "Nebulab3D <notifications@nebulab3d.com>"` en `.env.local`, Vercel y GitHub Secrets.
- [ ] Mandar email de prueba a un Gmail y a un Outlook → verificar que llega a inbox, no spam.

#### Acceptance criteria

- Email de bonificación llega a inbox de Gmail y Outlook sin caer en spam.
- El remitente se ve "Nebulab3D <notifications@…>" no "onboarding@resend.dev".
- SPF y DKIM pass según el header `Authentication-Results`.

---

### ENG-104 · Configurar GitHub Secrets para CI (verificación post-cambios)

**Categoría**: `security`, `dx`
**Priority**: P0
**Effort**: S
**Sprint origen**: ENG-002, ENG-007

#### Problema / Contexto

Después de varios cambios en env vars (Sentry, PostHog, Resend), verificar que TODOS los secretos necesarios están en GitHub Secrets para que el CI no falle ni se ejecute con valores stale.

#### Scope

- [ ] GitHub → repo `nebulab-b2b-app` → Settings → Secrets and variables → Actions.
- [ ] Verificar que existan y estén actualizados:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (apuntando a `nebulab3d-dev` después de ENG-102)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (rotated después de ENG-101)
  - [ ] `NEXT_PUBLIC_SENTRY_DSN`
  - [ ] `SENTRY_AUTH_TOKEN`
  - [ ] `SENTRY_ORG`, `SENTRY_PROJECT`
  - [ ] `NEXT_PUBLIC_POSTHOG_KEY` (si configuraste)
  - [ ] `RESEND_API_KEY` (si configuraste)
- [ ] Trigger un re-run del último workflow → debe pasar verde.

#### Acceptance criteria

- CI en main pasa verde con todos los pasos (format, lint, typecheck, test, build).
- Tests RLS no se skipean por falta de env vars.

---

### ENG-105 · Backup automático de DB verificado y restorable

**Categoría**: `security`, `ops`
**Priority**: P0
**Effort**: S
**Sprint origen**: RNF-2 PRD

#### Problema / Contexto

PRD §RNF-2 promete "backups automáticos diarios en Supabase, retención 30 días". Supabase Free Plan los tiene por default pero hay que verificar que están activos en TU proyecto y que se puede restaurar.

#### Scope

- [ ] Supabase Dashboard → tu proyecto → Database → Backups → verificar que hay backups diarios listados.
- [ ] Probar restore en un proyecto throwaway (NO en prod): tomar un backup, restaurarlo en un proyecto nuevo, verificar que el schema y data llegaron OK.
- [ ] Documentar el procedimiento de restore en `docs/RUNBOOK.md` (nuevo) — qué hacer si prod muere.

#### Acceptance criteria

- Hay ≥7 backups históricos visibles en el dashboard.
- Procedimiento de restore documentado y probado al menos 1 vez.

---

# P1 · Crítico para producción (11 tickets)

Producto funciona sin esto pero no debería estar en prod sin esto por mucho tiempo.

---

### ENG-201 · Rate limiting app-level para anon writes (waiter_calls, reviews, analytics)

**Categoría**: `security`, `feature`
**Priority**: P1
**Effort**: M
**Sprint origen**: ENG-003 (RNF-2 PRD)

#### Problema / Contexto

PRD §RNF-2 exige: "60 req/min por IP en endpoints públicos · 1 llamada activa por mesa, máximo 5 por hora". Hoy solo el primer punto está parcialmente cubierto (UNIQUE INDEX evita la 2da llamada simultánea, pero un atacante puede crear/resolver/crear/resolver). Cero rate limiting por IP.

#### Scope

- [ ] Instalar `@upstash/ratelimit` + `@upstash/redis` (free tier 10k req/día alcanza para MVP).
- [ ] Crear cuenta Upstash, generar Redis DB, agregar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a env vars.
- [ ] Crear helper `src/lib/ratelimit.ts` con 3 instancias: `anonWriteIp` (60/min), `waiterCallTable` (5/hora por table_id), `reviewContact` (1/30d por email — esto ya está en app pero no enforced).
- [ ] Aplicar en `createWaiterCall`, `submitReviewAction`, y en `trackComensalEvent` (este último menos crítico, opcional).
- [ ] Si rate-limited → devolver error claro al comensal ("Demasiados intentos, esperá un minuto").

#### Acceptance criteria

- 61 requests de la misma IP en 60s → la 61 falla con 429.
- 6 llamadas al mesero en la misma mesa en 1 hora → la 6ta falla con mensaje claro.
- Tests unitarios del helper.

---

### ENG-202 · Email automático al owner por reseña negativa

**Categoría**: `feature`, `ux`
**Priority**: P1
**Effort**: S
**Sprint origen**: ENG-017 (RF-3.2 PRD)

#### Problema / Contexto

PRD §RF-3.2 dice: "Reseñas 1-3 estrellas: notificación inmediata al dueño/manager con detalles". Hoy solo aparecen en `/admin/reviews` con flag visual. Si el owner no entra al panel, nunca se entera.

#### Scope

- [ ] En `submitReviewAction` (server), si la reseña queda `is_public=false`:
  - Buscar el email del owner del tenant (query `users` filtrado por `role='owner'`).
  - Enviar email vía Resend con: nombre del restaurante, rating, comentario, contacto del cliente, link al `/admin/reviews?filter=negative`.
- [ ] Crear template HTML simple en `lib/email/send-negative-review-alert.ts`.
- [ ] Test manual: dejar reseña 2★ → owner recibe email en <1min.

#### Acceptance criteria

- Reseña ≤ threshold → email al owner en <60s.
- Email incluye link directo al detalle de la reseña.
- Si hay múltiples owners (caso raro), email va a todos.

---

### ENG-203 · Tests E2E con Playwright para flujos críticos

**Categoría**: `test`, `dx`
**Priority**: P1
**Effort**: L
**Sprint origen**: Sprint 1 DoD

#### Problema / Contexto

Sprint 1 DoD lista Playwright E2E. Hoy tenemos 28 tests unit + RLS pero cero E2E. Cualquier cambio de UI puede romper flujos sin que CI lo agarre.

#### Scope

- [ ] `npm i -D @playwright/test` + `npx playwright install`.
- [ ] Crear `playwright.config.ts` con baseURL hacia el dev server.
- [ ] Tests críticos (uno por flow):
  - [ ] Super-admin: login → crear tenant + owner → ve credenciales.
  - [ ] Owner: primer login → cambio password → wizard onboarding 4 pasos → llega a dashboard.
  - [ ] Owner: crear categoría → crear plato → toggle disponibilidad → editar.
  - [ ] Owner: crear mesa → descargar QR PNG.
  - [ ] Comensal: escanear QR (URL directa) → ver menú → filtrar dietético → ver detalle plato.
  - [ ] Comensal: llamar al mesero → staff recibe → atender → resolver.
  - [ ] Comensal: dejar reseña 5★ → ve código + Google CTA.
- [ ] Agregar `npm run test:e2e` script.
- [ ] Workflow GitHub Actions separado (E2E corre solo en main, no en cada PR).

#### Acceptance criteria

- ≥7 tests E2E que cubren los flujos arriba.
- Pasan local y en CI.
- Tiempo total <5 min.

---

### ENG-204 · Branding de emails con React Email + dominio tenant

**Categoría**: `ux`, `feature`
**Priority**: P1
**Effort**: M
**Sprint origen**: ENG-017

#### Problema / Contexto

El email de bonificación hoy es HTML hardcoded en `lib/email/send-bonus.ts`. Funciona pero no usa el branding del tenant (logo, color). Los emails son la oportunidad #1 de marca post-experiencia.

#### Scope

- [ ] `npm i react-email @react-email/components`.
- [ ] Crear `emails/BonusEmail.tsx` con el template existente pero como componente React, recibiendo props (tenantName, logoUrl, brandColor, code, etc.).
- [ ] Actualizar `sendBonusEmail` para renderizar el componente y pasar el HTML resultante a Resend.
- [ ] Mismo tratamiento para `sendNegativeReviewAlert` (ENG-202) y futuros emails.
- [ ] Preview con `npx react-email dev` para iterar diseño.

#### Acceptance criteria

- Email muestra logo del tenant (si configurado) y color principal en el header/CTA.
- Renders consistentes en Gmail, Outlook, Apple Mail (testear con Litmus o Mail-Tester).

---

### ENG-205 · Banner de consentimiento Habeas Data para tracking del comensal

**Categoría**: `compliance`, `ux`
**Priority**: P1
**Effort**: S
**Sprint origen**: ENG-007

#### Problema / Contexto

PRD §RNF-2 invoca Ley 1581 (Habeas Data). Hoy tracking de comensal va solo a nuestra tabla `analytics_events` (sin PostHog), pero no tenemos banner de consentimiento explícito. Para cumplir literalmente: aviso opt-in/opt-out al primer escaneo del comensal.

#### Scope

- [ ] En el comensal page, primera vez por session_id, mostrar banner inferior: "Usamos cookies y eventos anónimos para mejorar la experiencia. [Aceptar] [Solo esenciales]".
- [ ] Persistir decisión en `localStorage.consent = 'all' | 'essential'`.
- [ ] Si `essential`, suprimir `trackComensalEvent` para eventos no-críticos (mantener `qr_scan` y `waiter_call` por ser core, suprimir `item_view`, `filter_used`, `search_used`).
- [ ] Link a `/privacidad` (nueva página estática con política — usar template estándar de Habeas Data Colombia).

#### Acceptance criteria

- Banner aparece la primera vez en cada navegador.
- Click "Solo esenciales" → no se registran analytics_events excepto qr_scan/waiter_call.
- Página `/privacidad` accesible.

---

### ENG-206 · Reemplazar todos los `console.error` por `logger.error`

**Categoría**: `obs`, `dx`
**Priority**: P1
**Effort**: S
**Sprint origen**: ENG-007

#### Problema / Contexto

Tenemos `pino` configurado en `lib/logger.ts` pero algunos archivos siguen usando `console.error`/`console.warn` directamente. Esto rompe la integración con Vercel logs (que esperan JSON estructurado en prod).

#### Scope

- [ ] Grep `console.error\|console.warn` en `src/`.
- [ ] Reemplazar por `logger.error({ ... }, 'mensaje')` o `logger.warn(...)`.
- [ ] Agregar regla ESLint `no-console: ['error', { allow: [] }]` (eliminar el current allow de warn/error) para prevenir regresiones.

#### Acceptance criteria

- 0 ocurrencias de `console.error`/`console.warn` en `src/` (excepto en tests si aplica).
- ESLint flagea cualquier intento futuro.
- En Vercel Logs los errores se ven como JSON estructurado con tenant_id, action, etc.

---

### ENG-207 · Helper de tracking server-side unificado (pino + posthog-node)

**Categoría**: `obs`, `dx`
**Priority**: P1
**Effort**: M
**Sprint origen**: ENG-007

#### Problema / Contexto

Hoy `posthog-node` está instalado y hay un helper `getPosthogServer()` pero nadie lo usa. Server Actions no trackean eventos en PostHog. Hay duplicación entre lo que va a `analytics_events` (comensal) y lo que debería ir a PostHog (admin).

#### Scope

- [ ] Crear `src/lib/tracking/server.ts` con helper `track({ event, distinctId, properties, groups })` que:
  - Loguea via pino (`logger.info`).
  - Envía a PostHog si está configurado.
  - Manejo de errores silencioso (no rompe la action).
- [ ] Llamar `track('tenant_created', { ... })` en `provisionTenant`, etc.
- [ ] Eventos clave: `tenant_created`, `owner_logged_in`, `menu_item_created`, `waiter_call_resolved`, `review_submitted`, `bonus_redeemed`.

#### Acceptance criteria

- Server Actions importantes llaman `track(...)`.
- Si no hay POSTHOG_KEY, no-op (sin error).
- Visible en PostHog Dashboard con filtros por tenant.

---

### ENG-208 · `must_change_password` self-update vía RPC SECURITY DEFINER

**Categoría**: `security`, `refactor`
**Priority**: P1
**Effort**: S
**Sprint origen**: ENG-004 (anti-patrón #3)

#### Problema / Contexto

Hoy `changePasswordAction` usa `createAdminClient()` (service_role) para bajar el flag `must_change_password` del usuario actual, porque RLS solo permite UPDATE a `owner`. Usar service_role es mejor evitarlo cuando se puede.

#### Scope

- [ ] Crear migración con RPC:
  ```sql
  CREATE OR REPLACE FUNCTION public.mark_password_changed()
  RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
    UPDATE public.users SET must_change_password = FALSE WHERE id = auth.uid()
  $$;
  GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;
  ```
- [ ] En `changePasswordAction`, reemplazar el `admin.from('users').update(...)` por `supabase.rpc('mark_password_changed')`.
- [ ] Test: staff hace cambio de password → flag baja sin usar service_role.

#### Acceptance criteria

- staff y manager pueden cambiar su password y el flag baja.
- No se usa service_role en este path.

---

### ENG-209 · Cleanup retroactivo de test data en proyecto Supabase actual

**Categoría**: `ops`, `dx`
**Priority**: P1
**Effort**: S
**Sprint origen**: ENG-002, ENG-003

#### Problema / Contexto

Durante los meses de desarrollo, los tests RLS crearon y borraron tenants/users con prefijo `rls-*` y `prov-*`. Si algún `afterAll` falló, quedaron huérfanos. Antes de mover prod a `nebulab3d-dev` (ENG-102), limpiar.

#### Scope

- [ ] Script `scripts/cleanup-test-tenants.ts`:
  ```ts
  // Borra auth.users + tenants cuyo slug empieza con 'rls-' o 'prov-'
  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from('tenants')
    .select('id, slug')
    .or('slug.like.rls-%,slug.like.prov-%');
  // Para cada tenant: borrar users de auth.users primero, luego el tenant.
  ```
- [ ] Correr `npx tsx scripts/cleanup-test-tenants.ts` contra prod (con confirmación interactiva).
- [ ] Verificar conteos antes/después.

#### Acceptance criteria

- 0 tenants con slug `rls-*` o `prov-*` en prod.
- 0 auth.users con email `*@nebulab3d.test`.

---

### ENG-210 · Definir y publicar pricing real (reemplazar placeholders)

**Categoría**: `ops`, `business`
**Priority**: P1
**Effort**: M
**Sprint origen**: PITCH-VENTAS.md

#### Problema / Contexto

`docs/PITCH-VENTAS.md` tiene placeholders `[X]`, `[Y]`, `[Z]` para los planes Starter/Standard/Pro/Enterprise. Sin pricing definido, no se puede vender.

#### Scope

- [ ] Investigar pricing de competencia en Colombia (Bemenu, MenuQR, alternativas regionales).
- [ ] Calcular costo unitario:
  - Hardware (impresión 3D + QR/NFC): ¿cuánto te cuesta cada centro de mesa?
  - SaaS (infra Supabase + Vercel + Resend): COP `[Y]`/mes por tenant.
  - Margen objetivo: 60-70%.
- [ ] Definir 4 planes con mesas, mensualidad, hardware incluido.
- [ ] Actualizar `docs/PITCH-VENTAS.md` con números reales.
- [ ] Definir política: ¿permanencia? ¿descuento primer mes? ¿descuento por volumen?
- [ ] Decidir si querés mostrar pricing en landing pública o "consultá precio" (B2B clásico).

#### Acceptance criteria

- 4 planes con pricing transparente y consistente con costos.
- Política de prueba/cancelación documentada.
- Pitch actualizado sin placeholders.

---

### ENG-211 · README + ADRs para que un dev nuevo pueda contribuir

**Categoría**: `docs`, `dx`
**Priority**: P1
**Effort**: M
**Sprint origen**: PRD §RNF-8

#### Problema / Contexto

PRD §RNF-8 menciona "Documentación técnica en GitHub (README + ADRs)". Hoy el README es bare-bones. Un dev nuevo no podría arrancar sin que vos le expliques. Cuando contrates, esto es bloqueador.

#### Scope

- [ ] Expandir `README.md`:
  - Cómo correr local desde 0 (clone, env vars, migrations, seed).
  - Arquitectura general (multi-tenant + RLS, route groups, etc.).
  - Cómo hacer una nueva feature (server action + RLS check + revalidate).
  - Cómo correr tests.
  - Cómo deployar.
- [ ] Crear `docs/adr/` con 1 ADR por decisión arquitectónica clave (ya están en el PRD pero como ADRs son más accesibles):
  - ADR-001 Stack Vercel + Supabase.
  - ADR-002 Multi-tenancy RLS + tenant_id.
  - ADR-003 Webapp comensal en lugar de app nativa.
  - ADR-004 current_tenant_id() vía DB lookup.
  - ADR-005 Tailwind 4 + shadcn v4 + Base UI.
  - ADR-006 RSC + Server Actions + unstable_cache.

#### Acceptance criteria

- Un dev externo puede correr el proyecto local siguiendo solo el README.
- ADRs documentadas y referenciadas desde README.

---

# P2 · Mejoras significativas (14 tickets)

Mejoras de UX/DX que valen la pena planificar.

---

### ENG-301 · Drag & drop para reordenar categorías y platos

**Categoría**: `ux`
**Priority**: P2
**Effort**: M
**Sprint origen**: ENG-009b, ENG-A

#### Problema / Contexto

Hoy reordenar es con flechas ↑↓ que swap posiciones de a uno. Para menús de 20+ platos esto es tedioso. UX premium es drag&drop.

#### Scope

- [ ] `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
- [ ] Wrapper `<SortableList>` reutilizable.
- [ ] Aplicar en `/admin/menu` (categorías + platos dentro de cada una).
- [ ] Optimistic UI: re-render local inmediato + persist con `bulkReorderAction` (nuevo) que actualiza posiciones en batch.
- [ ] Mantener flechas como fallback accesible.

#### Acceptance criteria

- Drag&drop funciona en desktop y mobile (touch).
- Reorden persiste tras reload.
- Accesible con teclado (dnd-kit lo provee).

---

### ENG-302 · Bulk import CSV de menú

**Categoría**: `ux`, `feature`
**Priority**: P2
**Effort**: M
**Sprint origen**: ENG-010

#### Problema / Contexto

Onboardear un restaurante con 80 platos plato-por-plato es un dolor. CSV import acelera enormemente.

#### Scope

- [ ] En `/admin/menu` agregar botón "Importar CSV".
- [ ] Template descargable con columnas: `category,name,description,price,ingredients,dietary_tags,calories,protein,carbs,fat,available`.
- [ ] Parser con Papaparse (`npm i papaparse @types/papaparse`).
- [ ] Validación con Zod, mostrar errores por fila.
- [ ] Categorías que no existen → crear automáticamente.
- [ ] Confirmación + preview antes de commit.

#### Acceptance criteria

- 80 platos importados en <30s.
- Errores por fila visibles (no aborta el lote completo).

---

### ENG-303 · Upload directo de logo del tenant

**Categoría**: `ux`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-009c

#### Problema / Contexto

Hoy `logo_url` es un input de texto donde el owner pega una URL externa (Imgur, Drive). UX pobre y propenso a links rotos.

#### Scope

- [ ] En `/admin/settings` reemplazar input por componente `<ImageUpload />`.
- [ ] Reusar `uploadMenuImage` (storage bucket `menu-images`) con path `<tenant_id>/logo/<random>.<ext>`.
- [ ] Preview inmediato del logo.
- [ ] Botón "Quitar logo" → setea a null + borra del storage.
- [ ] Mismo flujo para `cover_url` cuando se agregue (ENG-401 Tier 1 personalization).

#### Acceptance criteria

- Owner sube JPG/PNG → se guarda en storage → URL pública persiste en settings.
- Reemplazar logo borra el anterior del storage (no acumula basura).

---

### ENG-304 · Image cropping / aspect ratio enforcement

**Categoría**: `ux`
**Priority**: P2
**Effort**: M
**Sprint origen**: ENG-010

#### Problema / Contexto

Owners suben fotos verticales/horizontales/cuadradas mezcladas → el menú del comensal se ve inconsistente. Forzar aspect ratio con cropping en el upload.

#### Scope

- [ ] Instalar `react-easy-crop` o similar.
- [ ] En el form de plato (y logo), después de seleccionar archivo, abrir modal de crop con aspect ratio fijo (4:3 para platos, 1:1 para logo).
- [ ] El crop resultante se sube (no la imagen original).
- [ ] Opción "Saltar cropping" para owners avanzados.

#### Acceptance criteria

- Todos los platos nuevos tienen aspect 4:3.
- Logo siempre cuadrado.
- Sin cambios en imágenes ya subidas (no migración).

---

### ENG-305 · Filtros y búsqueda del comensal persistidos en URL

**Categoría**: `ux`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-011c

#### Problema / Contexto

Hoy filtros y búsqueda del comensal son state efímero — si recarga la página o comparte el link, se pierden. Persistir en URL `?diet=vegan,gluten_free&q=pizza`.

#### Scope

- [ ] Sincronizar `filters` y `query` state con `useSearchParams` + `router.replace`.
- [ ] Reverse: al cargar la página, leer URL params e inicializar state.
- [ ] Debounce el search (300ms) para no saturar URL changes.

#### Acceptance criteria

- Aplicar filtros → URL se actualiza.
- Refresh → filtros persisten.
- Compartir link con filtros → el otro lo abre con los mismos filtros.

---

### ENG-306 · CSV export del histórico de llamadas

**Categoría**: `feature`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-015 (RF-2.3 PRD)

#### Problema / Contexto

PRD §RF-2.3 lo lista pero quedó como deuda en Sprint 3. Útil para reportes mensuales del manager.

#### Scope

- [ ] Crear route handler `/admin/calls/history.csv` similar a `/admin/metrics.csv`.
- [ ] Acepta `?range=today|week|month` + `?table=<id>` (opcional).
- [ ] Columnas: created_at, mesa, razón, status, ack_at, resolved_at, resolved_by_email, tiempo_respuesta_min, tiempo_resolucion_min.
- [ ] Link "Exportar CSV" en `/admin/calls/history`.

#### Acceptance criteria

- CSV se descarga y abre en Excel/Sheets sin problemas.
- Encoding UTF-8 con caracteres especiales OK.

---

### ENG-307 · Notificaciones nativas del navegador para staff (tab no visible)

**Categoría**: `ux`, `feature`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-014

#### Problema / Contexto

Si el staff tiene otro tab activo, no escucha el beep ni ve el toast. Usar Notification API para alertar incluso con tab en background.

#### Scope

- [ ] En `/admin/calls`, al "Activar sonido" pedir también `Notification.requestPermission()`.
- [ ] Cuando entra nueva llamada Y `document.visibilityState !== 'visible'` → `new Notification('Mesa X te llama', { body: razón, icon: logo })`.
- [ ] Click en la notificación → focusea el tab.

#### Acceptance criteria

- Notificación nativa aparece cuando el tab está en background.
- En tab visible solo el toast + beep (sin duplicar).

---

### ENG-308 · Realtime en `/admin/reviews` para toast inmediato

**Categoría**: `ux`, `feature`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-018

#### Problema / Contexto

Hoy las reseñas aparecen al refrescar la página. Sería bueno toast en tiempo real ("Reseña negativa nueva — revisar") cuando el owner está mirando.

#### Scope

- [ ] Agregar `reviews` al supabase_realtime publication (migración).
- [ ] Cliente subscribe a inserts filtrados por `tenant_id`.
- [ ] Si `rating <= threshold` → toast rojo "Reseña negativa — Mesa X" con link a la review.
- [ ] Si `rating > threshold` → toast verde discreto "+1 reseña positiva".

#### Acceptance criteria

- Toast aparece en <3s después del INSERT.
- No requiere refresh.

---

### ENG-309 · Badge animado en sidebar "Llamadas (3)" cuando hay activas

**Categoría**: `ux`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-014

#### Problema / Contexto

Si el owner/staff está en otra pestaña del admin, no se entera que hay llamadas activas. Badge con contador en el sidebar.

#### Scope

- [ ] En admin layout, cliente component que subscribe a `waiter_calls` realtime, mantiene count de pendientes/acknowledged.
- [ ] Renderizar badge animado (pulse) al lado del link "Llamadas" cuando count > 0.

#### Acceptance criteria

- Badge muestra count correcto en cualquier ruta del admin.
- Pulse cuando aumenta el count.

---

### ENG-310 · Hook reusable `useActionToast` para Server Actions con feedback

**Categoría**: `dx`, `refactor`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-005

#### Problema / Contexto

Patrón duplicado en ~15 forms: `useFormState` + `useEffect` que llama `toast.success`/`toast.error`. Extraer a hook.

#### Scope

- [ ] Crear `src/lib/hooks/use-action-toast.ts`:
  ```ts
  export function useActionToast<T, A>(
    action: (prev: T, fd: FormData) => Promise<T>,
    initialState: T,
    options: { onSuccess?: (s: Extract<T, { ok: true }>) => void; successMessage?: string },
  ) {
    const [state, dispatch] = useFormState(action, initialState);
    useEffect(() => {
      /* toast logic */
    }, [state]);
    return [state, dispatch] as const;
  }
  ```
- [ ] Migrar 1-2 forms como prueba.
- [ ] Si funciona, migrar el resto (no urgente — la abstracción debe probar valor primero).

#### Acceptance criteria

- 2-3 forms usan el hook sin perder funcionalidad.
- Decisión: si suma claridad, plan para migrar el resto.

---

### ENG-311 · Editar slug/name/plan del tenant desde `/super/tenants/[id]`

**Categoría**: `feature`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-005

#### Problema / Contexto

Hoy desde `/super/tenants/[id]` se pueden ver datos del tenant pero no editarlos. Si un cliente cambia de nombre comercial o querés migrar slug, hay que hacerlo desde Supabase Dashboard.

#### Scope

- [ ] Sección "Editar datos" en el detalle del tenant.
- [ ] Form con `name`, `slug`, `plan` editables.
- [ ] La action `updateTenantAction` ya existe (ENG-005).
- [ ] Validar slug único + warning si se cambia ("vas a romper QRs físicos que apuntan al slug viejo — confirmar").

#### Acceptance criteria

- Super-admin puede editar y guardar.
- Confirmación explícita si cambia el slug.

---

### ENG-312 · Permitir volver atrás en el wizard de onboarding

**Categoría**: `ux`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-C

#### Problema / Contexto

El wizard solo avanza. Si te equivocaste en branding y estás en el paso 3, hay que cancelar y volver a empezar (o esperar a llegar al final e ir a settings). Mala UX.

#### Scope

- [ ] En cada paso 2-4, botón "← Volver" que navega al paso anterior.
- [ ] El paso 1 sigue sin volver (sería volver al login).
- [ ] Estado de cada paso ya está persistido en settings — al volver, el form se pre-llena con lo guardado.

#### Acceptance criteria

- Botón ← visible en pasos 2, 3, 4.
- Volver no pierde data.

---

### ENG-313 · Razones del waiter_call configurables por tenant

**Categoría**: `feature`
**Priority**: P2
**Effort**: S
**Sprint origen**: ENG-012

#### Problema / Contexto

Hoy las razones son 3 fijas: pedir/cuenta/otro. PRD §RF-2.1 dice "configurable por restaurante". Algunos quieren agregar "agua", "más servilletas", etc.

#### Scope

- [ ] En `/admin/settings` agregar sección "Razones de llamada al mesero" con lista editable (max 6).
- [ ] Persistir en `settings.waiter_call_reasons = string[]`.
- [ ] Si lista vacía, fallback a default (pedir/cuenta/otro).
- [ ] Comensal lee de settings y muestra las del tenant.

#### Acceptance criteria

- Owner edita razones → se reflejan en el comensal.
- Default funciona si nunca configuró.

---

### ENG-314 · Migrar `users.role`, `tenants.status`, `waiter_calls.status` a Postgres ENUM

**Categoría**: `dx`, `refactor`
**Priority**: P2
**Effort**: M
**Sprint origen**: ENG-002

#### Problema / Contexto

Hoy son TEXT + CHECK constraint. Funciona pero `supabase gen types` genera `string` en vez de union type, perdiendo type safety. Migrar a CREATE TYPE … AS ENUM trae union types automáticamente.

#### Scope

- [ ] Migración:
  ```sql
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');
  ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
  -- idem para tenant_status y waiter_call_status
  ```
- [ ] Regenerar tipos TS.
- [ ] Limpiar los `as` y casts manuales que ya no harán falta.

#### Acceptance criteria

- Types muestran `'owner' | 'manager' | 'staff'` en vez de `string`.
- App compila sin cambios funcionales.

---

# P3 · Nice-to-have / post-MVP (11 tickets)

Hacer cuando un cliente concreto lo pida o cuando aparezca bandwidth.

---

### ENG-401 · Personalización Tier 1 — tokens extendidos

**Categoría**: `feature`, `ux`
**Priority**: P3
**Effort**: L
**Sprint origen**: PERSONALIZACION-MENU.md

#### Problema / Contexto

Documento `docs/PERSONALIZACION-MENU.md` recomienda arrancar por Tier 1: más tokens (colores, fonts, density, cover image) + 2-3 templates más. Ejecutar cuando se sienta presión competitiva o cliente lo pida.

#### Scope

- Ver doc dedicado: `docs/PERSONALIZACION-MENU.md` sección "Opción 1 · Tokens extendidos".

---

### ENG-402 · Magic links como alternativa al login con password

**Categoría**: `feature`, `ux`
**Priority**: P3
**Effort**: M
**Sprint origen**: ENG-004

#### Problema / Contexto

PRD: "OAuth y magic link listos a futuro". Algunos owners prefieren no recordar password. Email magic link es UX premium.

#### Scope

- [ ] En `/login`, agregar tab "Por email (magic link)".
- [ ] `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
- [ ] Página `/auth/callback` para procesar el link clickeado.

---

### ENG-403 · Dialog component (shadcn add) cuando aparezca necesidad real

**Categoría**: `dx`
**Priority**: P3
**Effort**: S
**Sprint origen**: ENG-005

#### Problema / Contexto

Hoy confirmaciones destructivas usan `window.confirm` (feo, no brandable). Cuando justifique, agregar shadcn `dialog`.

---

### ENG-404 · Reentrada al wizard si owner quiere repetir setup

**Categoría**: `ux`, `feature`
**Priority**: P3
**Effort**: S
**Sprint origen**: ENG-C

#### Problema / Contexto

Una vez `onboarded_at` se setea, ya no se puede volver al wizard. Algunos owners podrían querer rehacer el setup completo (cambio de marca, segundo restaurante).

#### Scope

- [ ] En `/admin/settings` botón "Reiniciar onboarding" (con confirmación dura).
- [ ] Setea `onboarded_at = null` → siguiente refresh redirige al wizard.

---

### ENG-405 · Preview en vivo del menu_template en el wizard y en settings

**Categoría**: `ux`
**Priority**: P3
**Effort**: M
**Sprint origen**: ENG-C

#### Problema / Contexto

Hoy elegir template es "a ciegas" — solo lees la descripción. Preview thumbnail/iframe del comensal con la plantilla aplicada haría la decisión más informada.

---

### ENG-406 · Charts reales (recharts) en dashboard cuando justifique

**Categoría**: `ux`
**Priority**: P3
**Effort**: M
**Sprint origen**: ENG-019

#### Problema / Contexto

Hoy las barras del dashboard son CSS divs. Para análisis serio (timeline de escaneos por día, breakdown de revenue) recharts da más.

---

### ENG-407 · Sentry Replay habilitado en `/admin` con sample 1-5%

**Categoría**: `obs`
**Priority**: P3
**Effort**: S
**Sprint origen**: ENG-007

#### Problema / Contexto

Replay graba la sesión del usuario antes de un error. Muy útil para debugging pero suma costo y privacidad. Habilitarlo solo en admin (no comensal) con sample bajo.

---

### ENG-408 · Anti-fraude window de bonificación configurable por tenant

**Categoría**: `feature`
**Priority**: P3
**Effort**: S
**Sprint origen**: ENG-016

#### Problema / Contexto

Hoy hardcoded 30 días en `ANTI_FRAUD_DAYS`. Algunos tenants querrán 60d o 7d.

#### Scope

- [ ] Agregar `settings.bonus_anti_fraud_days` (default 30).
- [ ] UI en `/admin/settings` sección Bonificación.
- [ ] `submitReviewAction` lo lee del tenant.

---

### ENG-409 · Charts con time-series real (escaneos por día/hora)

**Categoría**: `feature`
**Priority**: P3
**Effort**: M
**Sprint origen**: ENG-019 + relacionado a ENG-406

#### Problema / Contexto

Dashboard hoy tiene totales agregados. Time-series ayuda a entender estacionalidad (martes vs sábado, día vs noche).

---

### ENG-410 · Migrar `unstable_cache` a `cache` API estable al pasar a Next 15

**Categoría**: `dx`, `refactor`
**Priority**: P3
**Effort**: M
**Sprint origen**: ENG-011

#### Problema / Contexto

`unstable_cache` es estable funcionalmente pero la API "estable" se llama `cache` en Next 15. Cuando upgradeemos, refactorizar.

---

### ENG-411 · 1-pager visual de ventas para entregar al cliente post-reunión

**Categoría**: `docs`, `marketing`
**Priority**: P3
**Effort**: M (requiere diseñador)
**Sprint origen**: PITCH-VENTAS.md

#### Problema / Contexto

El doc `PITCH-VENTAS.md` es para internal. Hace falta un PDF/HTML "follow-up" de 1 página con foto del centro de mesa + 3 features + contacto. No texto largo.

#### Scope

- [ ] Brief al diseñador con copy ya escrito en PITCH-VENTAS.md.
- [ ] Versión PDF + HTML.
- [ ] Hosteado en `/marketing/onepager` o similar para enviar link.

---

# Apéndice: tareas operativas (no técnicas)

Tareas que no son código pero quedan abiertas. No tienen ID ENG porque no son issues del repo.

- [ ] **OPS-1** Verificar facturación electrónica colombiana para clientes (DIAN). Plan + integración con sistema de facturación (Alegra, Siigo o similar).
- [ ] **OPS-2** Definir SLA escrito (uptime garantizado, tiempo de respuesta a soporte). Publicar en `docs/SLA.md` y referenciarlo en el contrato.
- [ ] **OPS-3** Plantilla de contrato/términos de servicio firmable por el cliente (consultar abogado).
- [ ] **OPS-4** Identidad visual cerrada (logo final, paleta, tipografía corporativa) si todavía está en proceso.
- [ ] **OPS-5** Setup de Google My Business + sitio landing `nebulab3d.com` con form de contacto.
- [ ] **OPS-6** Definir proceso de soporte: canal (email/WhatsApp), horario, SLA, persona responsable.
- [ ] **OPS-7** Capacitación documentada del onboarding al cliente (script de 1h de capacitación al staff incluido en el bundle).
- [ ] **OPS-8** Tracking de pipeline comercial (CRM ligero: HubSpot free, Notion CRM, Linear deals).

---

# Roadmap sugerido de ejecución

```
Mes 1 (post-MVP, pre-primer cliente)
  ├─ Toda la P0 (101-105). Bloqueante para vender.
  ├─ ENG-211 (README + ADRs) para que cualquier dev nuevo pueda contribuir.
  ├─ ENG-210 (pricing definido) para que el pitch funcione.
  └─ OPS-1, OPS-2, OPS-3 (facturación, SLA, contrato).

Mes 2 (primer cliente o dos onboardeados)
  ├─ ENG-201 (rate limiting) — riesgo creciente con tráfico real.
  ├─ ENG-202 (email negativo al manager) — momento de validar.
  ├─ ENG-203 (tests E2E) — sin esto, cualquier deploy te puede romper algo.
  └─ ENG-205 (banner Habeas Data) — antes que un cliente lo pregunte.

Mes 3-4 (3-5 clientes activos)
  ├─ ENG-204 (email branding) — ahora que tenés feedback de cómo se ven.
  ├─ ENG-302 (bulk CSV) — cuando empiece el dolor de cargar menús grandes.
  ├─ ENG-303 (upload logo) — cuando un cliente se queje.
  └─ ENG-308 (realtime reviews) — para que el owner reaccione más rápido.

Mes 5-6 (10+ clientes activos)
  ├─ Evaluar ENG-401 (Tier 1 personalization) según feedback de diferenciación.
  ├─ ENG-301 (drag&drop) — para mejorar UX.
  └─ Resto de P2 según pedidos concretos.

Posteriores
  └─ P3 a demanda.
```

---

_Backlog · Nebulab3D · 2026-05-18 · actualizar cada vez que se cierra/agrega ticket_
