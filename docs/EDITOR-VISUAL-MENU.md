# Editor Visual del Menú · Diseño técnico

**Última revisión:** 2026-07-02 · Estado: **Fase 1 aprobada para diseño, pendiente implementación.**

Cubre los requerimientos RF-5 a RF-14 y RNF-8 a RNF-11 del PRD del Editor Visual. Este documento registra las decisiones de la iteración de viabilidad y especifica la Fase 1.

> **Relación con `PERSONALIZACION-MENU.md`:** aquel doc (2026-05-18) recomendaba evitar el block builder (su "Tier 3") hasta demanda comprobada. Esta decisión lo supersede: se construye el editor por fases, donde **Fase 1 ≈ Tier 1+2** (tokens + theming + versionado) y **Fase 2 = Tier 3** (editor drag-and-drop de bloques). El análisis de esfuerzo/mantenimiento de aquel doc sigue vigente y es la razón del faseo.

---

## Decisiones tomadas (iteración 2026-07-02)

| Decisión          | Elección                                                                                        | Alternativa descartada                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Modelo del editor | **Bloques estructurados** (columna vertical de bloques tipados, estilo Notion/Shopify sections) | Canvas libre estilo Wix — rompía RF-11/12/14 y RNF-9                     |
| Qué se versiona   | **Solo el diseño** (layout + tema + bloques). Platos, precios y disponibilidad siguen en vivo   | Snapshot completo — publicar diseño no debe poder revivir precios viejos |
| Media en v1       | **Video y GIF incluidos** con guardrails (ver §Media)                                           | Diferirlos a v2                                                          |
| Orden             | **Fundación → Editor → v2**                                                                     | Editor visual primero                                                    |

### Por qué bloques y no canvas

- **RF-14** exige que filtros dietéticos y macros sigan funcionando → los platos deben seguir siendo datos estructurados (`menu_items`) renderizados por componentes nuestros. El bloque `menu_category` **referencia** datos, nunca los duplica.
- **RF-11** (responsive automático) sale gratis si cada bloque es responsive por construcción.
- **RF-12** (validaciones de calidad) es computable sobre tema + bloques tipados; sobre canvas libre es intratable.
- **RNF-9** (<2.5s en 4G) es controlable si el catálogo de bloques tiene presupuestos de peso.

---

## Arquitectura general

```
┌────────────────────── /admin/design ──────────────────────┐
│  Fase 1: forms + preview iframe   Fase 2: drag-and-drop   │
│  edita DRAFT de menu_designs  ────publicar──▶  PUBLISHED  │
└────────────────────────────────────────────────────────────┘
                                                   │
                              revalidateTag(design-by-slug)
                                                   ▼
┌──────────────── /r/[slug]/t/[tableId] (comensal) ─────────┐
│  RSC cacheado: lee design PUBLISHED (JSONB) + theme        │
│  → renderiza bloques → bloque menu_category consulta       │
│    menu_items EN VIVO (mismo pipeline cacheado actual)     │
│  Widgets del sistema (waiter call, reviews) siempre        │
│  presentes — no son removibles por el editor.              │
└────────────────────────────────────────────────────────────┘
```

- El **diseño** es un documento JSONB versionado en `menu_designs`.
- El **tema** (design tokens) vive en el mismo documento (se versiona junto con el layout).
- Los **datos del menú** (`menu_categories`, `menu_items`) no se versionan: siguen editándose en `/admin/menu` y se publican al instante, como hoy.
- Un tenant **sin diseño publicado** sigue usando el renderer legacy (`menu_template` de settings). Migración opt-in, cero riesgo para tenants existentes.

---

## Modelo de datos

### Tabla `menu_designs`

```sql
CREATE TABLE public.menu_designs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'archived')),
  design        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { schema_version, theme, blocks }
  version       INTEGER NOT NULL DEFAULT 1,
  -- RF-13: auditoría
  published_at  TIMESTAMPTZ,
  published_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- RF-13: lock de edición (lease con TTL, solo aplica al draft)
  locked_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un solo draft y un solo published por tenant
CREATE UNIQUE INDEX menu_designs_tenant_draft_idx
  ON public.menu_designs(tenant_id) WHERE status = 'draft';
CREATE UNIQUE INDEX menu_designs_tenant_published_idx
  ON public.menu_designs(tenant_id) WHERE status = 'published';
CREATE INDEX menu_designs_tenant_archived_idx
  ON public.menu_designs(tenant_id, published_at DESC) WHERE status = 'archived';
```

**Invariantes** (aplicadas por las server actions, los índices parciales las respaldan):

- ≤1 `draft` y ≤1 `published` por tenant.
- Publicar = archivar el `published` actual → promover el `draft` a `published` (copia; el draft sobrevive como base de la siguiente edición).
- Revert = tomar una `archived`, clonarla como nuevo `published`, archivar el anterior.
- Retención: conservar las últimas **10** archived por tenant (limpieza en la action de publish).

**RLS:** mismo patrón del repo — `SELECT` para authenticated del mismo tenant o super; `INSERT/UPDATE/DELETE` solo `owner|manager` (helper `is_owner_or_manager()`). **Anon NO lee la tabla**: el comensal recibe el diseño ya renderizado por RSC (igual que hoy con el menú, vía cliente cacheable + tag).

### Lock de edición (RF-13)

Lease simple en las columnas `locked_by/locked_at` del draft:

- **Adquirir:** `UPDATE ... SET locked_by = me, locked_at = now() WHERE (locked_by IS NULL OR locked_at < now() - interval '2 minutes' OR locked_by = me)` — si no afecta filas, otro usuario tiene el lock (mostrar quién).
- **Heartbeat:** el editor renueva `locked_at` cada 45s mientras está abierto.
- **TTL 2 min:** un lock sin heartbeat expira solo → no hay locks huérfanos.
- Guardar/publicar exigen ser el `locked_by` vigente.

---

## Documento de diseño (JSONB)

Validado con Zod en cada boundary (server actions y render). `schema_version` permite migrar el shape a futuro.

```jsonc
{
  "schema_version": 1,
  "theme": {
    "colors": {
      "brand": "#7c3aed", // CTA principal, acentos
      "background": "#ffffff",
      "surface": "#f8f7fb", // cards
      "text": "#1c1917",
      "muted": "#78716c",
    },
    "font_heading": "playfair", // de catálogo curado (next/font, self-hosted)
    "font_body": "inter",
    "radius": "rounded", // square | rounded | pill
    "density": "normal", // compact | normal | relaxed
  },
  "blocks": [
    {
      "id": "b1",
      "type": "hero",
      "props": { "show_logo": true, "cover_url": null, "headline": null },
      "overrides": {},
    },
    {
      "id": "b2",
      "type": "menu_category",
      "props": { "category_id": "<uuid>", "layout": "cards" }, // cards | list | grid
      "overrides": { "size": "md" },
    },
    {
      "id": "b3",
      "type": "banner",
      "props": { "text": "2x1 en cocteles hoy", "cta_label": null, "cta_url": null },
    },
    { "id": "b4", "type": "gallery", "props": { "image_urls": ["..."], "caption": null } },
    {
      "id": "b5",
      "type": "video_embed",
      "props": { "provider": "youtube", "video_id": "dQw4...", "title": "Nuestra cocina" },
    },
    { "id": "b6", "type": "animation", "props": { "media_url": "...", "alt": "" } }, // GIF/WebP animado subido
    { "id": "b7", "type": "text", "props": { "markdown": "..." } },
    {
      "id": "b8",
      "type": "button",
      "props": { "action": "call_waiter", "label": "Llamar al mesero" },
    }, // call_waiter | link
    { "id": "b9", "type": "footer", "props": { "show_socials": true, "show_hours": true } },
  ],
}
```

**Catálogo de bloques v1:** `hero`, `menu_category`, `text`, `image`, `gallery`, `banner`, `button`, `video_embed`, `animation`, `footer`. Combos y testimoniales → v2.

**Overrides por bloque (RF-8, personalización por excepción):** `size` (`sm|md|lg`), `align` (`left|center`), `hide_on` (`mobile|desktop`). Nada más en v1 — todo lo demás hereda del tema. Esto es deliberado: evita menús inconsistentes y mantiene las validaciones computables.

**Identidad del restaurante (RF-9):** nombre, logo, redes y horarios siguen viviendo en `tenants.settings` (datos del negocio, no del diseño); el tema los _referencia_. Así un revert de diseño no revive un teléfono viejo.

**Tipografías:** catálogo curado de 6 fuentes self-hosted con `next/font` (Inter, Playfair Display, Lora, Bebas Neue, IBM Plex Sans, Source Sans 3). No Google Fonts en runtime (RNF-9 y privacidad).

---

## Renderer del comensal (RF-14, RNF-9)

- `page.tsx` del comensal: si el tenant tiene design `published` → `<DesignRenderer design={...} />`; si no → renderer legacy actual (`MenuExperience` + `menu_template`). El fetch del design se cachea con `unstable_cache` + tag `tenant-design-by-slug:<slug>`, invalidado al publicar.
- Cada bloque es un **RSC**; solo hidratan los widgets interactivos (item drawer, waiter call, reviews) — que ya existen y se reutilizan tal cual.
- El bloque `menu_category` reusa `getPublicMenuCached` (datos en vivo) y los componentes de render de items actuales, incluyendo filtros dietéticos y macros.
- **Bloques del sistema:** waiter-call widget y review widget se renderizan siempre (anclados al final / flotantes), no son parte del array de bloques → imposible que un diseño los rompa.
- Tema → CSS variables en el wrapper (`--color-brand`, `--radius`, etc.); los bloques consumen solo vars. Cero CSS arbitrario del usuario (también es la defensa XSS: nunca se renderiza HTML/CSS crudo del owner; `text` pasa por render de markdown con sanitización).

## Media (RNF-11 + decisión "video/GIF en v1")

Restricción de infraestructura: **no hay transcoding server-side en Vercel** (límites de las functions). Guardrails v1:

| Tipo          | Cómo                                                                                                                                                    | Límites                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Imágenes      | Upload a Storage (bucket existente, prefix por tenant) con **resize/compresión client-side** (canvas) antes de subir + validación de tamaño server-side | ≤ 1MB post-resize, formatos jpg/png/webp |
| GIF/animación | Se sube tal cual (convertir client-side no es confiable), **lazy-load obligatorio** y nunca above-the-fold                                              | ≤ 4MB, máx 2 por diseño                  |
| Video         | **Solo embeds** (YouTube/Vimeo) con _facade pattern_: thumbnail estático + player carga al tap                                                          | Sin límite (no pesa en carga inicial)    |

- **Quota por tenant (RNF-11):** 200MB en plan base (campo `plan` de tenants ya existe para diferenciarlo). Se calcula sumando el prefix del tenant en Storage al subir; si excede, el upload se rechaza con mensaje claro.
- Video subido nativamente (no embed) queda explícitamente **fuera de v1** — requiere Mux/Cloudinary (decisión de costo aparte).

## Validaciones de publicación (RF-12)

Corren en la server action `publishDesign` (server-side, no confiamos en el cliente):

1. Schema Zod válido + `schema_version` soportada.
2. Referencias vivas: cada `menu_category.category_id` existe y está activa; URLs de media pertenecen al Storage del tenant.
3. Contraste WCAG AA (≥4.5:1) entre pares del tema (`text/background`, `text/surface`, `brand/background`).
4. Contenido mínimo: ≥1 bloque `menu_category`, hero o nombre visible.
5. Presupuesto de peso: suma estimada de assets del primer viewport ≤ 500KB; GIFs nunca en el primer bloque.
6. Advertencias no bloqueantes (ej. categoría sin platos disponibles) vs errores bloqueantes (contraste, referencias rotas).

## Server actions (contratos)

```
saveDraftAction(designJson)         → valida Zod + lock → upsert draft
publishDesignAction()               → lock + validaciones RF-12 → archivar published,
                                      promover draft, podar archived >10,
                                      revalidateTag(design-by-slug)
revertDesignAction(archivedId)      → clonar archived → nuevo published + revalidate
acquireDesignLockAction() / heartbeat / release
```

Todas con `requireTenantUser(['owner','manager'])`, patrón `ActionResult` del repo.

---

## Plan de implementación

### Fase 1 · Fundación (~1-2 sprints) — sin drag-and-drop aún

1. Migración `menu_designs` + RLS + tipos.
2. Schemas Zod del documento (`theme` + bloques v1).
3. `DesignRenderer` RSC + biblioteca de bloques v1 + CSS vars del tema.
4. Integración comensal con fallback a legacy.
5. Plantillas como presets: 4 iniciales (elegante, casual, café, comida rápida) = tema + bloques generados desde el menú existente del tenant.
6. `/admin/design` v1: elegir plantilla, editar tema (color pickers, fuentes), reordenar/activar bloques **con forms** (up/down como el menú actual), preview iframe mobile/desktop, guardar borrador, publicar (con validaciones), historial + revert.
7. Pipeline de imágenes (resize client-side + quota)
8. Tests: schema, validaciones de publish, render de bloques, e2e publish→comensal.

### Fase 2 · Editor visual (~2-3 sprints)

Drag-and-drop (dnd-kit), inspector de props por bloque, preview live con postMessage, lock con heartbeat + presencia, undo/redo en cliente, resto de plantillas (8 totales).

### Fase 3 · v2

Combos, testimoniales, galería avanzada, visibilidad por dispositivo ampliada, video nativo (Mux/Cloudinary), colaboración multi-editor.

## Riesgos principales

| Riesgo                                               | Mitigación                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Scope creep del catálogo de bloques                  | Catálogo v1 cerrado (10 tipos); nuevos bloques = feature work con schema + tests              |
| Diseños feos / ilegibles dañan la marca del producto | Overrides mínimos + validaciones bloqueantes + plantillas curadas como único punto de partida |
| Migración de tenants existentes                      | Opt-in: legacy renderer sigue funcionando; preset inicial se genera desde su menú actual      |
| Evolución del shape JSONB                            | `schema_version` + migradores puros al leer (nunca mutar en DB)                               |
| GIFs rompen el presupuesto 4G                        | Límite duro 4MB/2 por diseño + lazy-load + prohibidos above-the-fold (validación de publish)  |
