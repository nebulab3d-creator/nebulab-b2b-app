# Manual de Usuario · Nebulab3D

Plataforma SaaS para restaurantes: el comensal escanea el QR del centro de mesa Nebulab3D, ve el menú interactivo, llama al mesero y deja reseñas con bonificación. El restaurante gestiona menú, atiende llamadas en tiempo real, y revisa métricas y reseñas desde un panel admin.

Este manual cubre:

1. [Conceptos rápidos y roles](#1-conceptos-rápidos-y-roles)
2. [Para el equipo Nebulab3D (super-admin)](#2-para-el-equipo-nebulab3d-super-admin)
3. [Para el owner del restaurante](#3-para-el-owner-del-restaurante)
4. [Para manager](#4-para-manager)
5. [Para staff (mesero)](#5-para-staff-mesero)
6. [Anexo: lo que ve el comensal](#6-anexo-lo-que-ve-el-comensal)
7. [Preguntas frecuentes y troubleshooting](#7-preguntas-frecuentes-y-troubleshooting)
8. [Soporte](#8-soporte)

---

## 1. Conceptos rápidos y roles

**Tenant** = un restaurante. Cada tenant es independiente: tiene su menú, mesas, usuarios, llamadas y reseñas separadas del resto.

**Roles dentro de un restaurante:**

| Rol                | Qué puede hacer                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**          | Todo lo del restaurante: configuración, menú, mesas, llamadas, reseñas, métricas. Cambia la contraseña inicial y crea futuros usuarios (próxima versión). |
| **Manager**        | Igual que owner excepto: editar configuración del restaurante y crear/editar usuarios.                                                                    |
| **Staff (mesero)** | Solo la pestaña de Llamadas, donde recibe avisos en tiempo real y los marca como atendidos.                                                               |

**Roles fuera del restaurante:**

- **Super-admin (Nebulab3D)** — equipo interno que crea tenants, da de alta owners y gestiona el estado de cada restaurante.
- **Comensal** — el cliente del restaurante. No tiene cuenta, no descarga nada, accede solo escaneando el QR del centro de mesa.

**URLs principales:**

- `https://<tu-dominio>/login` — login para owner, manager, staff y super-admin
- `https://<tu-dominio>/admin` — panel del restaurante
- `https://<tu-dominio>/super` — panel interno Nebulab3D
- `https://<tu-dominio>/r/<slug>/t/<table-id>` — el QR del comensal apunta acá

---

## 2. Para el equipo Nebulab3D (super-admin)

### 2.1 Crear un tenant nuevo + owner inicial

Cuando cierras la venta del bundle (hardware + SaaS) con un restaurante:

1. Entrá a `https://<tu-dominio>/login` con tu cuenta de super-admin.
2. Te lleva automáticamente a `/super/tenants` (lista de todos los tenants).
3. Click **"+ Nuevo tenant"** (esquina superior derecha).
4. Llená los campos del restaurante:
   - **Nombre comercial** — visible para el comensal (ej: "Pizza Pepe")
   - **Slug** — parte de la URL, minúsculas/números/guiones, único (ej: `pizza-pepe`). El comensal lo verá en `/r/pizza-pepe/t/...`
   - **Plan** — por ahora solo `basic`
5. Llená los datos del owner inicial:
   - **Nombre completo** del responsable
   - **Email** — al que llegarán las notificaciones de reseñas negativas y bonificaciones
6. Click **"Crear tenant + owner"**.
7. La siguiente pantalla muestra **una sola vez** las credenciales:
   - Email del owner
   - Contraseña temporal (8-16 caracteres aleatorios)
   - **Copiá las dos** (click en el código las selecciona). Nebulab3D no las puede recuperar después — solo se podrían resetear vía email.
8. Compartile las credenciales al owner por **canal seguro** (Slack, WhatsApp, llamada). NO por email plano si lo evitás.

> El owner, al primer login, va a estar forzado a cambiar la contraseña antes de ver el panel.

### 2.2 Editar el estado de un tenant

Desde `/super/tenants/<id>` (click "Ver" en la lista):

- **Reactivar** — el restaurante vuelve a operar (vuelve a aparecer su menú al escanear QR).
- **Suspender** — el restaurante deja de operar temporalmente. El comensal verá "Restaurante no encontrado" al escanear. Los datos quedan intactos.
- **Cancelar** — equivalente a suspender pero indica que "no vuelve" (semánticamente: cuenta dada de baja). Los datos también quedan intactos; podés borrarlos manualmente desde Supabase si querés purgarlos.

> No hay borrado total desde el panel. Si necesitás eliminar un tenant completamente (y todos sus datos), hay que hacerlo desde la consola de Supabase.

### 2.3 Reset de contraseña del owner

Desde `/super/tenants/<id>` → en la fila del owner, click **"Reset pwd"**.

Esto envía un email de restablecimiento al owner. Si Resend no está configurado o el email no llega, el owner puede usar `/forgot-password` directamente.

### 2.4 Crear más super-admins

Esto **no** está disponible desde el panel todavía. Se hace por línea de comandos:

```bash
npm run seed:super-admin -- --email nuevo@nebulab3d.com --password <password-fuerte>
```

El script es idempotente: si el usuario ya existe, le actualiza la contraseña.

---

## 3. Para el owner del restaurante

### 3.1 Primer login

1. Recibís de Nebulab3D un email/mensaje con tu **email + contraseña temporal**.
2. Andá a `https://<tu-dominio>/login`.
3. Ingresá email + contraseña temporal.
4. La app te lleva automáticamente a `/change-password` y te exige elegir una contraseña nueva (mínimo 8 caracteres).
5. Guardá → entrás al dashboard `/admin`.

> No podés saltarte el cambio: la app te redirige una y otra vez a `/change-password` hasta que lo hagas.

### 3.2 Recorrido del panel

Tu pantalla está dividida en:

- **Header** arriba: nombre del restaurante · "Panel" · tu nombre + rol · botón **Salir**
- **Sidebar** a la izquierda:
  - Dashboard
  - Menú
  - Mesas
  - Llamadas
  - Reseñas
  - Configuración (solo owner)
  - Usuarios (próximamente)
- **Contenido** a la derecha: cambia según lo que clickees en el sidebar

### 3.3 Configuración del restaurante

`Sidebar → Configuración`. Tres bloques:

**Branding y bienvenida:**

- **Nombre comercial** — lo que ve el comensal en la cabecera del menú
- **Color principal (hex)** — formato `#1f2937`. Usado para botones del comensal ("Llamar al mesero", etc.)
- **URL del logo** — link público a la imagen de tu logo (podés usar Imgur, Google Drive con permisos públicos, tu sitio web, etc. La subida directa de archivos viene en próxima versión)
- **Mensaje de bienvenida** — texto opcional que aparece arriba del menú (ej: "Bienvenidos a Pizza Pepe — pizzas a la piedra desde 1985")

**Bonificación por reseña:**

- **Tipo**: descuento %, valor fijo, item gratis, otro
- **Valor**: ej `10` para 10% o `5000` para $5000 COP o "Postre del día"
- **Texto que ve el comensal**: ej "10% off en tu próxima visita"
- **Condiciones** (opcional): ej "Válido lunes a jueves, no acumulable"
- **Vigencia (días)**: cuántos días desde la emisión es válido el código

> Si no configurás bonificación, el comensal igual puede dejar reseña — solo que no se emite código.

**Reseñas:**

- **Threshold público** (default 4): reseñas con rating ≥ este valor se consideran "públicas" y al comensal se le muestra el botón "Publicá en Google". Por debajo, quedan internas (solo vos las ves).
- **Google Place ID** (opcional): tu identificador de Google Business para que el botón "Publicá en Google" funcione. Encontralo en https://developers.google.com/maps/documentation/places/web-service/place-id

### 3.4 Crear el menú

`Sidebar → Menú`. Vas a ver dos botones arriba a la derecha: **"+ Categoría"** y **"+ Plato"**.

**Crear categorías** (entradas, platos fuertes, bebidas, postres…):

1. Click **"+ Categoría"** → nombre → click crear.
2. Las categorías aparecen en orden de "Orden" (número bajo = aparece primero). Podés reordenar después con flechas **↑ ↓** al lado de cada una.

**Crear platos:**

1. Click **"+ Plato"** → vas al form.
2. Campos:
   - **Nombre** y **Descripción**
   - **Precio** (COP, sin puntos ni símbolo — solo número)
   - **Orden** dentro de su categoría
   - **Categoría** (elegí una de las que creaste, o "sin categoría" si querés que aparezca aparte)
   - **Imagen** (JPG/PNG/WebP/AVIF, máximo 5MB; opcional pero muy recomendado)
   - **Ingredientes** (uno por línea o separados por coma — ej `Tomate, mozzarella, albahaca`)
   - **Tags dietéticos** (vegetariano, vegano, sin gluten, sin lactosa, sin nueces, picante, no picante) — el comensal puede filtrar por estos
   - **Macros** (calorías, proteína, carbs, grasa) — opcionales pero suman valor
   - **Disponible** — si lo desmarcás, el plato deja de aparecer en el menú del comensal pero no se borra (útil para "se acabó por hoy")
3. Click **"Crear plato"**.

> Los platos sin categoría aparecen al final del menú en una sección "Otros". Si ves un cartel amarillo arriba del menú que dice "hay X platos sin categoría", asignales una.

**Editar un plato:**

- Desde `Menú → categoría → click en el plato` o desde la grilla `Menú → click "Editar"`.
- Cambiá lo que quieras. Si subís nueva imagen, la vieja se borra del storage automáticamente.

**Borrar un plato:**

- Botón rojo "Borrar plato" en el form de edición. Acción irreversible.

### 3.5 Crear mesas y descargar QR

`Sidebar → Mesas`.

1. Click **"+ Nueva mesa"** → ingresá número o nombre (ej `1`, `Mesa A`, `Terraza 3`) → click crear.
2. Cada mesa genera automáticamente su QR único.
3. Para descargar el QR:
   - **PNG individual**: en la fila de cada mesa, click "PNG"
   - **SVG individual**: click "SVG" (mejor para impresión grande)
   - **ZIP con todos los QR activos**: arriba a la derecha, click "Descargar todos los QR (ZIP)"

> Imprimí los QR y pegalos en los centros de mesa Nebulab3D. El comensal abre la cámara, apunta al QR, y se abre la webapp.

**Editar mesa:**

- Click "Ver/editar" → cambiar número o activar/desactivar. Una mesa **inactiva** muestra "Restaurante no encontrado" al escanear su QR.

**Borrar mesa:**

- Botón rojo en el detalle. Las llamadas y reseñas asociadas se borran también.

### 3.6 Revisar llamadas (ver sección Staff para el flujo completo)

`Sidebar → Llamadas` muestra las llamadas activas en tiempo real. Como owner las podés gestionar igual que el staff (ver sección 5).

`Llamadas → Histórico` muestra el historial con métricas: tiempo promedio de respuesta, mesa más activa, etc.

### 3.7 Revisar y gestionar reseñas

`Sidebar → Reseñas`. Vas a ver una tabla con todas las reseñas + filtros arriba:

- **Todas** — sin filtro
- **Positivas 4-5★** — las que se invitaron a publicar en Google
- **⚠️ Negativas 1-3★** — solo las ves vos (resaltadas en ámbar), el comensal no las publica
- **Con código** — las que generaron un código de bonificación

Cada fila muestra: rating, comentario, contacto del cliente, código emitido, estado (interna/pública, 📧 enviada, ✓ redimida), fecha.

**Marcar una bonificación como redimida:**

- Cuando un cliente vuelve con su código y se lo aplicás en la cuenta, click **"Marcar redimida"** en la fila. Esto te ayuda a no aceptar el mismo código dos veces.

### 3.8 Dashboard de métricas

`Sidebar → Dashboard` (`/admin`). Es la pantalla de inicio.

**Stats (6 tarjetas arriba):**

- Escaneos QR
- Vistas de plato
- Filtros usados
- Llamadas mesero
- Reseñas
- Rating promedio

**Selector de rango temporal** arriba a la derecha: Hoy · 7 días · 30 días.

**Gráficos abajo:**

- Top 10 platos más vistos
- Mesas más activas

**Exportar CSV:** link "CSV" arriba a la derecha → descarga un `.csv` con todas las métricas del rango seleccionado, listo para abrir en Excel.

### 3.9 Recuperar tu contraseña

Si te olvidás:

1. `/login` → "Olvidé mi contraseña"
2. Ingresá tu email → click "Enviar link"
3. Te llega un email con un link → cliquealo
4. Ingresá tu nueva contraseña → entrás de vuelta

> Si el email no llega en 2-3 minutos, revisá spam. Si tampoco, pedile a Nebulab3D que use el botón "Reset pwd" desde el panel super-admin (sección 2.3).

---

## 4. Para manager

Como manager tenés acceso a todo lo del owner **excepto**:

- Sidebar → **Configuración** (no aparece)
- Sidebar → **Usuarios** (no aparece — además es feature de próxima versión)

Todo lo demás funciona igual:

- Crear y editar menú (categorías + platos)
- Crear y editar mesas + descargar QR
- Ver y resolver llamadas activas
- Ver reseñas y marcar bonificaciones redimidas
- Ver dashboard y exportar CSV

Si necesitás cambiar branding del restaurante (color, logo, bonificación, etc.), pedile al owner.

---

## 5. Para staff (mesero)

Tu única responsabilidad en el panel es atender las **Llamadas** en tiempo real.

### 5.1 Tu primer ingreso

1. Pedile al owner que te dé tu email + contraseña inicial.
2. Andá a `/login`, ingresá, cambiá la contraseña en `/change-password`.
3. Te lleva al panel admin. Solo vas a poder usar la pestaña **Llamadas** del sidebar.

### 5.2 Activar el sonido (importante, la primera vez)

Cuando abrís `/admin/calls`, vas a ver un cartel amarillo arriba:

> 🔔 Activá el sonido para escuchar cuando una mesa te llame.

Click **"Activar sonido"**. Vas a oír un beep corto de prueba. Esto se requiere por restricción de los navegadores — no podemos reproducir audio sin tu primer click.

> Si nunca lo activás, vas a ver las llamadas pero no las vas a escuchar. Activalo cada vez que abrís el panel en una pestaña nueva.

### 5.3 Atender una llamada

Cuando una mesa te llama:

1. Aparece una tarjeta de color en pantalla con: **Mesa X**, la razón ("pedir", "cuenta", "otro") y cuánto hace que llamó.
2. Sonido beep.
3. Toast verde arriba a la derecha: "Mesa X te llama".

**Color de la tarjeta según antigüedad:**

- Verde — menos de 1 minuto
- Ámbar — entre 1 y 3 minutos
- Rojo — más de 3 minutos

**Dos acciones:**

- **"Voy en camino"** — le avisás al comensal que ya vas. Su pantalla cambia a "Tu mesero está en camino" en tiempo real. La tarjeta queda en pantalla pero pasa a estado "en camino".
- **"Atendida"** — marca la llamada como resuelta. Desaparece de la lista. Ya podés atender una llamada nueva de esa misma mesa.

> Una mesa solo puede tener **una llamada activa por vez**. Si el comensal intenta llamar de nuevo mientras hay una pendiente o en camino, su botón le dice "Ya hay una llamada activa".

### 5.4 Si se cierra el navegador

Las llamadas siguen activas en el servidor. Si volvés a abrir `/admin/calls`, vas a ver todas las pendientes esperándote. Activá el sonido de nuevo.

---

## 6. Anexo: lo que ve el comensal

Esta sección NO es para el comensal — el comensal no necesita manual. Esto es para que el restaurante sepa qué experiencia tienen sus clientes y pueda responder dudas.

### 6.1 El flujo completo

1. **Llega a la mesa**, ve el centro de mesa Nebulab3D con el QR.
2. **Escanea el QR** con la cámara de su celular. Se abre la webapp en el navegador (sin instalar nada, sin registro).
3. **Ve el menú** con:
   - Header con el logo + nombre + número de mesa
   - Mensaje de bienvenida (si lo configuraron)
   - Tabs horizontales de categorías (Entradas, Platos, Bebidas, Postres…)
   - Barra de búsqueda
   - Filtros dietéticos: Vegetariano, Vegano, Sin gluten, Sin lactosa, Sin nueces, Picante, No picante (multi-select)
   - Cards de platos con foto, nombre, precio, tags
4. **Toca un plato** → modal con foto grande, descripción, ingredientes, info nutricional (calorías, proteína, carbs, grasa) si está cargada.
5. **Llama al mesero** (botón fijo abajo): elige razón (Pedir / Cuenta / Otro) → confirma → ve banner "Mesero notificado, llegará pronto" con tiempo transcurrido.
6. **Recibe actualización en vivo**: cuando el mesero clickea "Voy en camino", su banner cambia a "Tu mesero está en camino".
7. **Después de comer**, ve el CTA "⭐ Dejá una reseña y ganá [tu bonificación]" (si configuraron una).
8. **Llena la reseña**: estrellas (1-5), comentario opcional, nombre opcional, email o teléfono (requerido para bonificación).
9. **Submit**:
   - **Si rating ≥ threshold (público)**: ve su código de bonificación en pantalla + botón "Publicá esta reseña en Google" (si configuraste el Place ID). Si dio email y Resend está activo, también le llega por mail.
   - **Si rating < threshold (negativo)**: ve solo "Gracias por tu feedback, lo tomamos en serio". NO se le ofrece publicar en Google. La reseña te llega a vos para que la trabajes internamente.

### 6.2 Anti-fraude de bonificaciones

El mismo email/teléfono **solo recibe 1 código cada 30 días por restaurante**. Si la misma persona deja varias reseñas, las posteriores se guardan pero no emiten código nuevo.

### 6.3 Texto sugerido para el cartel/QR

Una frase corta debajo o al lado del QR para guiar al comensal:

> **Escaneá para ver el menú, llamar al mesero o dejarnos una reseña.**

O más explícito:

> **¿Qué podés hacer con tu celular?**
> 📖 Ver el menú con fotos · 🛎️ Llamar al mesero · ⭐ Ganar [bonificación] dejando reseña

---

## 7. Preguntas frecuentes y troubleshooting

### Acceso al panel

**"No me llega el email de restablecimiento de contraseña"**

- Revisá la carpeta de spam.
- Por defecto Supabase usa un remitente genérico — puede caer en filtros más estrictos.
- Si Nebulab3D configuró un dominio propio en Resend, debería llegar bien.
- Como último recurso, pedile a Nebulab3D que te haga reset desde el panel super-admin (sección 2.3).

**"Olvidé que tenía que cambiar la contraseña inicial y se cerró el navegador"**

- Volvé a `/login` con email + contraseña temporal. Vas a entrar de nuevo al flujo de cambio forzado.

**"El sistema me devuelve al login todo el tiempo"**

- Tu sesión expiró o el navegador borró cookies. Volvé a hacer login.

### Menú

**"Cargué un plato y no aparece en el menú del comensal"**

- Verificá que el plato esté marcado como **Disponible** (en el form de edición).
- Verificá que su **categoría** esté **Activa** (`Menú → click categoría → Editar`).
- El menú del comensal cachea por 60 segundos: esperá ese minuto o el comensal recarga la página.

**"Subí imagen y no aparece"**

- Tamaño máximo 5 MB. Formatos: JPG, PNG, WebP, AVIF.
- Si la subida falló, el form te avisa. Probá una imagen más chica o cambiá formato.

**"El precio se ve mal — aparece como 0 o sin decimales"**

- Ingresá solo el número entero en pesos colombianos, sin puntos ni símbolos. Ej: `15000`, no `15.000` ni `$15.000`.

### Mesas y QR

**"Escanéo el QR y dice 'Restaurante no encontrado'"**

- La mesa está marcada como **inactiva**. Reactivala desde `Mesas → click la mesa → marcar "Mesa activa"`.
- O el tenant entero fue suspendido (contactá a Nebulab3D).

**"Descargué el QR y apunta a `localhost:3000`"**

- Esto pasa si el deploy no tiene configurada la variable `NEXT_PUBLIC_APP_URL` con el dominio real. Es tarea de Nebulab3D — pedíles que la corrijan en Vercel y te regenerás los QR.

**"Quiero borrar una mesa pero tiene reseñas asociadas"**

- Al borrar la mesa se pierden las reseñas y llamadas asociadas. Si querés conservarlas, **desactivá** la mesa en vez de borrarla.

### Llamadas

**"No suena cuando entra una llamada"**

- Click el botón "Activar sonido" arriba del listado, **una vez por sesión** (cada vez que abrís el navegador). Es por restricción de los browsers, no es un bug.
- Verificá el volumen del dispositivo.

**"El comensal me llama y la llamada nunca llega al panel"**

- Verificá conexión a internet del dispositivo del staff.
- Refresca el panel. Si seguís sin ver llamadas que sabés que existen, contactá Nebulab3D.

**"Quiero anular una llamada sin atenderla"**

- Clickeá "Atendida" igual. No hay opción separada de "cancelar" — la idea es que toda llamada queda registrada en el histórico.

### Reseñas y bonificaciones

**"El comensal dice que dejó reseña pero no veo nada en el panel"**

- Refresca `/admin/reviews`. Filtros activos (positivas/negativas) pueden estar ocultándola.
- Si el comensal calificó 1-3★, está en el filtro "Negativas".

**"El código de bonificación generado no se envió por email al comensal"**

- Verificá que tengamos `RESEND_API_KEY` configurada (es responsabilidad de Nebulab3D).
- Si no, el código igual se mostró al comensal en pantalla — pedíle que te lo dé verbalmente o por foto.

**"Un cliente me trae el mismo código de bonificación dos veces"**

- Click "Marcar redimida" la primera vez. La segunda vas a ver el flag ✓ redimida en la fila → no la apliques.

**"El comensal dejó una reseña 5★ pero no se le ofreció el botón de Google"**

- Verificá que tengas configurado el **Google Place ID** en `Configuración → Reseñas`. Sin eso, no aparece el botón.

### Métricas

**"El dashboard muestra todo en 0"**

- Probablemente estás en el rango "Hoy" y todavía no hay actividad. Cambiá a "7 días" o "30 días".
- O ningún comensal escaneó todavía. Las métricas se llenan cuando hay tráfico real.

**"El CSV no se descarga"**

- Algunos navegadores bloquean descargas automáticas. Mirá la barra de descargas / popup permissions.

### Operativa

**"Quiero cambiar de plan (más mesas, más features)"**

- Contactá a Nebulab3D. Hoy hay un solo plan `basic`; planes superiores vienen en próximas versiones.

**"Quiero agregar otro restaurante a mi cuenta"**

- Cada restaurante es un tenant independiente. Contactá a Nebulab3D para que te demos de alta el segundo y vinculemos tu mismo email como owner (si querés gestionarlos por separado, vas a tener que loguearte en cada uno).

**"Quiero borrar todos mis datos definitivamente (right to be forgotten)"**

- Contactá a Nebulab3D. El equipo borra el tenant + datos asociados (mesas, menú, llamadas, reseñas, eventos analytics) en cumplimiento Ley 1581.

---

## 8. Soporte

- **Email**: soporte@nebulab3d.com _(reemplazar por la dirección real cuando se defina)_
- **Horario de atención**: lunes a viernes 9-18 (COT)
- **Reportar un bug o pedir una feature**: en el email indicá el nombre del restaurante, qué estabas haciendo, qué esperabas y qué pasó.
- **Capacitación inicial al staff**: incluida en el bundle. Coordinala con el equipo Nebulab3D que cerró la venta.

---

_Versión del manual: 1.0 · cubre MVP Sprints 1-4 · última revisión 2026-05-18_
