# Personalización del menú · opciones y comparativa

Documento de decisión para definir cuán lejos queremos llegar con la personalización del menú del comensal. Cubre 5 opciones, sus implicancias técnicas y de negocio, y una recomendación de roadmap.

**Última revisión:** 2026-05-18 · cubre estado del MVP post-Sprints 1-4 + ENG-A/B/C.

## TL;DR

- Hoy ofrecemos **3 templates fijos** (`default`, `compact`, `grid`) + tokens básicos de marca (color, logo, mensaje de bienvenida).
- Para soportar "100% personalizado" hay un espectro de 5 niveles. **Recomendación: arrancar por Tier 1 (extender tokens), reservar Tier 4 (templates custom por cliente) como servicio adicional vendido aparte cuando aparezca demanda real.**
- **Evitar Tier 3 (block builder) hasta tener ≥10 clientes pidiéndolo explícitamente.** Es construir Webflow desde cero.
- Tier 5 (API headless) solo si entramos a Enterprise.

---

## Por qué importa esta decisión

El menú visual es el principal artefacto que el cliente del restaurante muestra a sus comensales. Es donde más sensibilidad de marca tienen: muchos restaurantes consideran que "su menú" es parte de su identidad visual (tipografía, paleta, fotografía, layout).

Hoy estamos en el extremo más restrictivo del espectro: el comensal de Restaurante A se ve casi idéntico al de Restaurante B salvo color principal + logo. Esto funciona para MVP pero será un blocker comercial en cuanto:

- Un cliente compare con competidores que ofrecen más personalización (TheFork, Goorder, Restoo, soluciones de e-commerce headless).
- Un restaurante premium quiera diferenciarse visualmente.
- Una cadena/franquicia exija control total sobre la imagen.

La pregunta no es "¿lo hacemos?", es "**¿cuánto, cuándo, y a qué costo de mantenimiento?**".

---

## Opción 1 · Tokens extendidos

**Qué es:** el sistema actual de plantillas se queda, pero agregamos muchos más tokens configurables. Sigue siendo un catálogo cerrado de opciones pero con muchas más combinaciones.

**Qué ve el owner del restaurante:**

- Sección "Diseño del menú" en `/admin/settings` con más controles:
  - Colores: brand (principal), background, surface (cards), accent (CTAs secundarios), text, muted
  - Tipografía: 4-6 fonts (Inter, Playfair Display, Lora, Bebas Neue, IBM Plex, Source Sans)
  - Tamaño base de texto: pequeño / normal / grande
  - Border radius: cuadrado / redondeado / pill
  - Espaciado: denso / normal / relajado
  - Cover image (banner arriba del menú)
- Catálogo de templates: pasamos de 3 a 5-6 (sumamos `magazine`, `classic-menu`, `mobile-first-xl`)

**Cómo se ve al comensal:**

- Cada combinación de tokens + template produce algo distinto. Pero dos restaurantes que elijan los mismos valores se verían igual.

**Persistencia:** `tenants.settings.theme = { colors, font, density, radius, cover_url }`.

**Esfuerzo:** 1-2 sprints (~2-3 semanas).

- 60% UI del admin (form de tokens con preview).
- 30% comensal (mapear tokens a CSS vars + condicionales en componentes).
- 10% templates nuevos (cada uno es un componente React).

**Mantenimiento:** Bajo. Tokens son CSS vars. Templates son componentes versionados con el código.

**Pros:**

- Cubre el 80% de "se ve diferente a la competencia" sin construir nada complejo.
- Es self-serve para el owner (no requiere intervención del equipo Nebulab3D).
- Bajo riesgo técnico: si algo rompe, fácil rollback.
- Tipografía + colores cambian la percepción de marca dramáticamente.

**Contras:**

- Sigue habiendo un techo: dos clientes que eligen los mismos tokens se ven igual.
- No permite agregar/quitar secciones del menú (siempre es: header + tabs categorías + grid items + footer).
- Owners "obsesivos del detalle" van a chocar contra los límites del catálogo.

**Plan de pricing:** parte del plan base. Es comoditario en el mercado.

---

## Opción 2 · Theme builder visual

**Qué es:** misma idea de tokens que Tier 1, pero con UI de edición rica + preview en vivo.

**Qué ve el owner del restaurante:**

- Pantalla dedicada `/admin/design` (o `/admin/settings/design`):
  - Lado izquierdo: panel de controles agrupados por sección (Colores, Tipografía, Espaciado, Imágenes).
  - Lado derecho: iframe con preview del comensal en tiempo real.
  - Sliders, color pickers visuales (no hex manual), upload directo de cover/logo, font preview, presets nombrados (ej: "Casual & cálido", "Moderno & limpio", "Lujo & sobrio").
- Botón "Previsualizar como comensal" abre nueva pestaña con la URL real.
- Botón "Revertir" guarda historial de los últimos 5 cambios.

**Cómo se ve al comensal:**

- Mismas posibilidades que Tier 1 pero con mucho más control granular sobre los valores específicos (ej: el owner puede ajustar el azul exacto que quiere, no elegir entre 4 azules predefinidos).

**Persistencia:** `tenants.settings.theme` con esquema más rico + tabla nueva `tenant_theme_history` para versionado.

**Esfuerzo:** 3-4 sprints (~6-8 semanas).

- 50% UI del builder (split-pane con preview).
- 25% live preview con postMessage entre admin y iframe del comensal.
- 15% versionado y reset.
- 10% upload directo a storage para cover/logo (reutiliza bucket `menu-images` con prefix).

**Mantenimiento:** Medio. La UI del builder es compleja. Cada token nuevo requiere pensar UX en el panel. La feature de presets exige curaduría.

**Pros:**

- WOW factor en demo: el cliente ve cómo su menú cambia en vivo mientras configura.
- Diferenciador comercial fuerte vs competidores con catálogos cerrados.
- Justifica un plan superior (Pro / Plus).
- Reutiliza el modelo de tokens — sigue siendo manejable técnicamente.

**Contras:**

- 3-4 sprints es un cuarto del año.
- Live preview entre admin y comensal tiene complejidad (postMessage, CORS, sincronización).
- Sigue dentro del cataloging — no permite layouts radicalmente diferentes.

**Plan de pricing:** feature exclusiva de plan Pro / Plus. Justifica +30-50% sobre plan base.

---

## Opción 3 · Block-based page builder

**Qué es:** el owner arma su propia página de menú con bloques. Estilo Notion / Webflow / Elementor.

**Qué ve el owner del restaurante:**

- Editor de página: lista vertical de bloques, drag & drop para reordenar.
- Catálogo de tipos de bloques:
  - Hero (logo + nombre + welcome message + cover)
  - Categoría de menú (referencia a una categoría existente, opciones de layout)
  - Banner promocional (texto + CTA + color)
  - Galería de fotos (carrusel de imágenes del local)
  - Testimoniales / reseñas destacadas
  - Información del local (mapa, horarios, teléfono)
  - Texto libre (markdown)
  - Footer
- Cada bloque tiene panel de props lateral con opciones específicas.
- Preview en vivo en mobile + desktop.

**Cómo se ve al comensal:**

- Cada restaurante puede tener una página radicalmente distinta. Algunos pueden tener solo el menú; otros un home rico con secciones.

**Persistencia:**

```jsonc
tenants.settings.page_blocks = [
  { type: 'hero', props: { ... } },
  { type: 'banner_promo', props: { ... } },
  { type: 'menu_category', props: { category_id: '...', layout: 'cards' } },
  { type: 'menu_category', props: { category_id: '...', layout: 'list' } },
  { type: 'footer', props: { ... } },
]
```

**Esfuerzo:** 1 quarter completo (12+ semanas).

- 30% editor visual del admin (drag&drop, paneles de props, undo/redo).
- 25% biblioteca de bloques (cada uno: componente React + schema de props + UI de edición).
- 15% preview en vivo multi-device.
- 15% migración: cómo conviven `page_blocks` con `menu_template` viejo. Default = generar bloques iniciales a partir del menú actual.
- 15% tests + edge cases (bloques vacíos, referencias rotas, mobile breakpoints).

**Mantenimiento:** Alto. Cada bloque nuevo es feature work: componente + props schema + UI de edición + tests + docs. Versionado complejo cuando cambia el shape de props. Soporte: clientes se traban con UX del builder.

**Pros:**

- Verdadera diferenciación. Cada cliente puede tener algo único sin que tu equipo intervenga.
- Encierro positivo (lock-in): una vez que arman su página, cambiar de proveedor cuesta.
- Premium muy vendible: pricing fácilmente 2-3x del plan base.

**Contras:**

- Construir Webflow desde cero. Hay startups enteras dedicadas a esto.
- Curva de aprendizaje alta para owners no técnicos.
- Mobile-first es duro: bloques que se ven lindos en desktop suelen romper en mobile y viceversa.
- Combinatoria de bloques mal compuestos puede generar páginas feas → reputación de producto.
- Hace falta un sistema de templates de partida (no podés esperar que cada restaurante arme desde cero).

**Plan de pricing:** plan Pro+ o Enterprise. Justifica +100-200% sobre plan base.

---

## Opción 4 · Templates custom por cliente (servicio profesional)

**Qué es:** para clientes que pagan extra, el equipo Nebulab3D construye un componente React específico para su brand. No hay UI de edición — el equipo lo mantiene.

**Qué ve el owner del restaurante:**

- Probablemente nada en el admin (no edita el template, solo el menú).
- En el comensal, su URL renderiza su template exclusivo, diseñado por el equipo Nebulab3D con su brand.
- Si quiere cambiar algo del diseño, abre ticket → el equipo lo trabaja como un proyecto de diseño.

**Cómo se ve al comensal:**

- Total libertad creativa. Podría ser un menú animado con scroll-jacking, un menú interactivo en 3D, lo que sea.

**Persistencia:**

- Carpeta `src/templates/custom/` con un archivo por cliente, ej `src/templates/custom/andres-carne-de-res.tsx`.
- `tenants.settings.custom_template_id = "andres-carne-de-res"` (string que mapea a una key del registry).
- La comensal page hace lazy-import:
  ```ts
  if (settings.custom_template_id) {
    const Custom = await import(`@/templates/custom/${settings.custom_template_id}`);
    return <Custom.default tenant={...} menu={...} table={...} />;
  }
  ```

**Esfuerzo:**

- Inicial (estructura del registry + 1er template): 1 sprint.
- Per cliente: depende del scope, típicamente 1-2 semanas de diseño + 1-2 semanas de implementación.

**Mantenimiento:**

- Cada cambio importante del schema o de los componentes core puede romper templates custom.
- Disciplina: los templates custom solo consumen una API pública estable (props del Page), no importan internals.
- Si el equipo crece, designar 1 persona como "owner de templates custom".

**Pros:**

- Cero compromisos creativos. El cliente obtiene exactamente lo que quiere.
- Margen alto: cobrás USD 2-5k por setup + mensualidad recurrente.
- Fideliza al cliente premium (alto switching cost).
- Permite competir con agencias de branding que ofrecen "menú digital custom" como servicio one-off.

**Contras:**

- No escala sin equipo de diseño/dev dedicado.
- Riesgo de scope creep: el cliente "premium" pide cambios constantes.
- Cada template es deuda técnica permanente.
- Si el cliente se va, el código queda igual (no es reutilizable salvo en partes).

**Plan de pricing:** plan Enterprise. Cobrás setup + mensualidad recurrente con SLA específico.

---

## Opción 5 · API headless + dominio custom

**Qué es:** Nebulab3D queda como backend puro. El cliente hostea su propia webapp con cualquier framework y consume nuestra API.

**Qué ve el owner del restaurante / cliente:**

- Recibe credenciales de API (API key + secret).
- Su equipo técnico construye la webapp del comensal sobre su propio dominio (`menu.suempresa.com`).
- Sigue usando nuestro panel admin para gestionar menú, mesas, llamadas, reseñas — pero el comensal lo ve a través de su propia capa.
- Webhooks le notifican eventos en tiempo real (waiter_call, review_submitted).

**Persistencia:** sin cambios en `tenants`. Se suma `api_keys` table + sistema de billing por API calls.

**Esfuerzo inicial:** 1-2 sprints (~3-4 semanas).

- 30% SDK JS/TS publicado en npm (`@nebulab3d/sdk`).
- 25% documentación tipo Stripe (recipes, examples, playground).
- 20% sistema de API keys (crear, revocar, scopear).
- 15% webhooks (firma HMAC, retry policy, dashboard de entregas).
- 10% rate limiting + usage tracking + facturación.

**Mantenimiento:** Alto y permanente. Cada cambio del API tiene que ser backwards-compatible o versionado. Soporte técnico a integradores. Documentación viva.

**Pros:**

- Mercado completamente nuevo: cadenas grandes y franquicias que quieren control total.
- Pricing por uso: cobrás por requests + suscripción base. Margen alto.
- Lock-in fuerte: una vez que el cliente integró, migrar es proyecto de meses.

**Contras:**

- Gran inversión inicial.
- Cambias de "producto SaaS" a "plataforma API" — modelo de soporte distinto.
- Limita la velocidad de iteración de features visuales (toda novedad tiene que estar también en API).
- El cliente toma responsabilidad de UX → si el comensal ve algo malo, te llama igual aunque vos no hayas escrito ese código.

**Plan de pricing:** plan Enterprise + cobro por API calls. Setup mínimo USD 5-10k. Mensualidad USD 1-5k según volumen.

---

## Comparativa lado a lado

|                                               | **Tier 1** Tokens extendidos | **Tier 2** Theme builder | **Tier 3** Block builder      | **Tier 4** Templates custom    | **Tier 5** API headless             |
| --------------------------------------------- | ---------------------------- | ------------------------ | ----------------------------- | ------------------------------ | ----------------------------------- |
| **Nivel de personalización**                  | Medio-bajo                   | Medio                    | Alto                          | Total (por cliente)            | Total (control del cliente)         |
| **Self-serve**                                | Sí                           | Sí                       | Sí (con curva de aprendizaje) | No (servicio)                  | Sí (con equipo técnico del cliente) |
| **Esfuerzo inicial**                          | 1-2 sprints                  | 3-4 sprints              | 1 quarter                     | 1 sprint + per-cliente         | 1-2 sprints                         |
| **Mantenimiento**                             | Bajo                         | Medio                    | Alto                          | Alto (cada template)           | Muy alto (API stability)            |
| **Riesgo técnico**                            | Bajo                         | Medio                    | Alto                          | Medio                          | Alto                                |
| **Pricing tier típico**                       | Base                         | Pro                      | Pro+                          | Enterprise (servicio)          | Enterprise (API)                    |
| **Costo extra para el cliente**               | Incluido                     | +30-50%                  | +100-200%                     | USD 2-5k setup + mensualidad   | USD 5-10k setup + por uso           |
| **Tiempo a primera entrega**                  | 3 semanas                    | 8 semanas                | 12+ semanas                   | 4-6 semanas (1er cliente)      | 4 semanas (MVP del SDK)             |
| **Escalable sin staff extra**                 | Sí                           | Sí                       | Sí (con buen UX)              | No                             | Sí (después del setup)              |
| **Diferenciador comercial**                   | Bajo                         | Medio-alto               | Alto                          | Muy alto                       | Muy alto                            |
| **Riesgo de UX rota por mal uso del cliente** | Bajo                         | Bajo                     | Alto                          | Bajo (lo controlamos nosotros) | Alto (responsabilidad del cliente)  |
| **Lock-in del cliente**                       | Bajo                         | Medio                    | Alto                          | Muy alto                       | Muy alto                            |

---

## Matriz de decisión: ¿cuál elegir según contexto?

| Tu situación actual                                             | Recomendación            | Por qué                                                        |
| --------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| MVP con 1-10 clientes pequeños/medianos                         | **Tier 1**               | Cubre 80% de "se ve diferente", bajo costo, rápido.            |
| 10-30 clientes y empiezan a comparar contra competencia premium | **Tier 1 + Tier 2**      | Tier 1 mejora la base, Tier 2 se vende como upgrade.           |
| Aparece 1 cliente grande/cadena que paga 3-5x el plan base      | **Tier 4**               | Servicio dedicado. No cambies el producto por 1 cliente.       |
| 5+ clientes premium pidiendo diseños únicos                     | **Tier 4 sistematizado** | Equipo de diseño + dev. Ya es servicio profesional con escala. |
| ≥10 clientes piden agregar/quitar secciones del menú            | **Tier 3**               | Recién acá justifica construir un builder.                     |
| Entran cadenas con equipo técnico propio que quieren integrar   | **Tier 5**               | Pivotamos a plataforma.                                        |

---

## Roadmap recomendado (escalable, conservador)

```
Sprint actual ── MVP cerrado (Sprints 1-4 + ENG-A/B/C)
                 3 templates fijos + tokens básicos.

[+ 1 mes]    ── Tier 1 · extender tokens (colores, fonts, density, cover, 2-3 templates más)
                Sin cambio en pricing. Marketing: "diseño más personalizable".

[+ 3 meses]  ── Evaluar demanda real:
                  ¿Algún cliente pidió template custom? → Tier 4 (vender como servicio).
                  ¿Quejas de "se ve igual que la competencia"? → considerar Tier 2.
                  ¿Nadie pidió nada? → posponer.

[+ 6 meses]  ── Si justifica: Tier 2 (theme builder) para Plan Pro.
                Lanzar segundo plan. Migrar 2-3 clientes premium piloto.

[+ 12 meses] ── Si justifica: empezar conversaciones con cadenas para Tier 5.
                NO construir antes de tener carta de intención + presupuesto.

[+ 18 meses] ── Tier 3 (block builder) SOLO si:
                  - ≥10 clientes lo pidieron explícitamente, Y
                  - tenemos un PM/diseñador full-time, Y
                  - el roadmap puede absorber 1 quarter sin features de revenue.
                Si alguno de los 3 falla → no.
```

---

## Riesgos cruzados (qué romperías al avanzar)

| Si pasás de         | a                     | Qué se rompe / qué cuidar                                                                                                                                 |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier 1 → 2          | Tokens estructurados  | Migración de `settings.theme` (más campos). Backfill con defaults.                                                                                        |
| Tier 2 → 3          | Editor de bloques     | El template viejo deja de aplicar — hay que generar `page_blocks` por default a partir del menú actual. Sin esto, cada tenant ve menú vacío al activarse. |
| Tier 3 → 4          | Templates por cliente | Hay que decidir si los bloques siguen aplicando a clientes con template custom o no. Posiblemente sí (algunos bloques compartidos).                       |
| Cualquiera → Tier 5 | API pública           | Toda feature nueva de UI tiene que estar también en API. Doble trabajo de aquí en más.                                                                    |

---

## Riesgo del "no decidir nada"

Quedarse en el estado actual (3 templates fijos) por mucho tiempo tiene su propio costo:

- Clientes que valoran branding se van a competidores que ofrecen más.
- Demos con prospectos premium se ven débiles vs alternativas.
- El producto se percibe como "barato/genérico" lo cual presiona el pricing hacia abajo.
- Si más adelante decidís invertir en Tier 2/3, lo hacés con presión competitiva en vez de proactivamente.

Tier 1 es la jugada mínima para no quedarte atrás. Es relativamente barato y compra tiempo para evaluar las otras opciones con data real.

---

## Anexo: referencias del mercado

- **TheFork / Quandoo**: tokens cerrados (similar a Tier 1).
- **GoorderHub / Restoo**: theme builder visual (similar a Tier 2).
- **Webflow / Framer**: block builder verdadero (Tier 3, pero como producto general, no nicho restaurantes).
- **Square / Toast** menus: ofrecen Tier 4 a clientes Enterprise (con design team interno).
- **Twilio / Stripe / Shopify Headless**: Tier 5 como modelo de negocio principal.

Ningún competidor 100% focalizado en restaurantes de Colombia/LatAm ofrece Tier 2-3 fuerte. Hay ventana competitiva si te decidís en los próximos 12 meses.

---

## Próximos pasos sugeridos

1. **Esta semana**: validar con 3-5 clientes existentes o prospectos: "¿qué te parece la personalización actual? ¿qué te gustaría poder cambiar?". Si la respuesta consistente es "solo más colores y fuentes" → Tier 1. Si es "quiero armar mi página como Webflow" → considerar Tier 3 más temprano.
2. **Próximo sprint**: arrancar Tier 1 si la validación lo respalda.
3. **Trimestre próximo**: re-evaluar con data real (qué tokens usaron, qué pidieron, qué cliente se fue por personalización).
4. **Antes de comprometer a Tier 4 con un cliente**: armar un proceso de delivery (brief, mockups, sprints, SLA) y costear bien. El primer template custom suele costar 2x lo planeado.

---

_Documento de decisión · Nebulab3D · 2026-05-18_
