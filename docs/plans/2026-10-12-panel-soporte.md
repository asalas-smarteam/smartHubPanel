# Plan 4b: Soporte en el panel (cliente y bandeja de Smarteam)

- **Estado:** borrador, pendiente de aprobación. No se toca código hasta que se apruebe.
- **Spec:** `docs/specs/2026-10-12-panel-soporte-design.md`, §2 Soporte y §4 Frontend (historias S1, S4 a S12).
- **Base:** plan 4a (`docs/plans/2026-10-12-panel-base.md`), ya en `main` (`c4eea5a`). Se reutilizan su cliente HTTP, sesión, permisos, tabla paginada, tema de vidrio y MSW.
- **Repo:** `smartHubPanel`, rama `main`. El commit y el push los hace el usuario.
- **Depende de:** nada para empezar. La API de tickets se simula con MSW siguiendo el contrato del spec. El backend la construye en el plan 2 (Soporte).

## Qué queda funcionando al terminar

**Cliente** (`admin` y `usuario`, permisos `tickets.*`):
1. **Soporte**: lista paginada de los tickets de su empresa, con filtros por estado y categoría e indicador de **respuesta nueva** (S4, S9).
2. **Nuevo ticket**: título, categoría, descripción e imágenes, por botón o **pegando con Ctrl+V** (S1). Acepta un contexto opcional (evento o sync) que usará el plan 4c para "Reportar problema" (S2, S3).
3. **Detalle**: descripción, contexto, hilo de mensajes con imágenes, responder y **"Sigue fallando"** si está resuelto (S9, S11). Nunca muestra la resolución interna.

**Smarteam** (permiso `staff.tickets`):
4. **Bandeja**: todos los tickets de todos los tenants, paginada, con **contadores por estado** arriba y filtros por estado, empresa y categoría (S5). Avisa si una empresa no pudo cargarse (`warnings`).
5. **Detalle**: descripción, contexto con JSON formateado y plegable (S6), hilo, **línea de tiempo** (S12), responder (S7), **"Esperando cliente"** (S8), **"Resolver"** con mensaje al cliente + resolución interna obligatorios (S10), editar la resolución interna y **"Volver a trabajarlo"** desde resuelto.

**General:**
6. Menú: "Soporte" (`tickets.read`), "Bandeja" (`staff.tickets`) y "Usuarios" (`staff.users`). El inicio lleva al primero permitido: el cliente cae en Soporte y Smarteam en la Bandeja.
7. Visor JSON del panel (`react-json-view-lite`, elegido en el 4a), listo para el plan 4c.
8. Las pantallas se cargan por separado (`lazy`), lo que resuelve el aviso de bundle grande del 4a.
9. Mocks de MSW con la máquina de estados del ticket, adjuntos y la bandeja de varios tenants, y tests de todo lo anterior.

## Fuera de alcance

- Pantallas de Eventos y Syncs y sus botones "Reportar problema" (plan 4c). Aquí solo queda lista la entrada con contexto.
- Abrir un ticket en nombre del cliente (S14), métricas (S13) e IA (S15, S16): fases siguientes.
- Notificaciones de cualquier tipo (el spec no las tiene).
- Refresco automático en vivo: la información se actualiza al navegar, al volver a la pestaña y después de cada acción.
- Docker y nginx (plan 4d).

---

## 1. Contrato de API que usa este plan

### 1.1 Lo que el spec ya define

**Cliente** (el tenant sale de la sesión; nunca se manda `tenantKey`):

| Endpoint | Permiso | Uso |
|---|---|---|
| `GET /api/tickets?status=&category=&page=&pageSize=` | `tickets.read` | Lista, sin `messages` ni `internalResolution`, con `hasNews`. |
| `POST /api/tickets` (multipart: `title`, `description`, `category`, `contextType?`, `contextId?`, imágenes) | `tickets.create` | Crear. |
| `GET /api/tickets/:id` | `tickets.read` | Detalle sin `internalResolution`. Marca `clientLastSeenAt`. |
| `POST /api/tickets/:id/messages` (multipart: `body`, imágenes) | `tickets.reply` | Responder. |
| `POST /api/tickets/:id/reopen` `{ message }` | `tickets.reopen` | "Sigue fallando". |
| `GET /api/tickets/:id/attachments/:fileId` | `tickets.read` | Imagen. |

**Smarteam** (permiso `staff.tickets`):

| Endpoint | Uso |
|---|---|
| `GET /api/staff/tickets?status=&tenantKey=&category=&page=&pageSize=` | Bandeja, con `tenantKey` y `companyName`, y `warnings` si un tenant falló. |
| `GET /api/staff/tickets/summary` | Contadores por estado y tenant. |
| `GET /api/staff/tenants/:tenantKey/tickets/:id` | Detalle **con** `internalResolution`. Marca `staffLastSeenAt`. |
| `POST /api/staff/tenants/:tenantKey/tickets/:id/messages` (multipart) | Responder. |
| `POST /api/staff/tenants/:tenantKey/tickets/:id/status` `{ to }` | `esperando_cliente` o `en_progreso`. |
| `POST /api/staff/tenants/:tenantKey/tickets/:id/resolve` (multipart: `message`, `internalResolution`, imágenes) | Resolver. |
| `PUT /api/staff/tenants/:tenantKey/tickets/:id/internal-resolution` `{ text }` | Editar la nota interna. |
| `GET /api/staff/tenants/:tenantKey/tickets/:id/attachments/:fileId` | Imagen. |

**Reglas del spec que el front y los mocks respetan:**
- Estados `abierto`, `en_progreso`, `esperando_cliente`, `resuelto`. Categorías `sincronizacion`, `documentos`, `precios`, `mapeos`, `acceso`, `otro`.
- Transiciones: el primer mensaje de Smarteam pasa `abierto → en_progreso` y fija `firstResponseAt`; Smarteam pasa `en_progreso → esperando_cliente`; un mensaje del cliente pasa `esperando_cliente → en_progreso`; "Resolver" desde cualquier estado menos `resuelto` exige los dos textos; "Sigue fallando" pasa `resuelto → abierto` con mensaje y suma `reopenCount`; Smarteam puede pasar `resuelto → en_progreso`. Cualquier otra → `409`.
- No se borran tickets ni se editan mensajes.
- Título ≤ 150, descripción y mensajes ≤ 5000 caracteres.
- Imágenes: hasta 5 por mensaje, 5 MB cada una, PNG, JPEG o WebP (el servidor valida por los bytes; SVG prohibido).
- Bandeja: `page × pageSize` ≤ 1000; más allá se pide filtrar.
- Paginación `{ items, page, pageSize, total }`, `pageSize` ≤ 100.
- El cliente ve el nombre del dev que le respondió con la etiqueta "Smarteam" (decisión por defecto 4 del spec).

### 1.2 Lo que el spec no define y este plan **asume** (a confirmar en el plan 2 del backend)

Los mocks implementan exactamente esto. Igual que en el 4a, el front valida cada respuesta con Zod (`invalid_response` si no coincide) y **no depende del cuerpo de las mutaciones**: después de cada acción vuelve a pedir el detalle y las listas.

| # | Tema | Supuesto |
|---|---|---|
| D1 | Ítem de la lista del cliente | `{ id, code, title, category, status, createdBy: { name, role }, openedAt, lastActivityAt, resolvedAt, reopenCount, hasNews, contextType }` (`contextType` es `null` si no tiene contexto). |
| D2 | Ítem de la bandeja | Lo de D1 más `tenantKey`, `companyName`, `firstResponseAt`. `hasNews` se calcula desde el lado de Smarteam (último autor cliente y posterior a `staffLastSeenAt`). Respuesta: `{ items, page, pageSize, total, warnings: [{ tenantKey, error }] }` (`warnings` puede faltar o venir vacío). |
| D3 | Detalle | Lo de D1 más `description`, `context: { type, refId, snapshot } \| null`, `messages`, `statusHistory`, `firstResponseAt`; en el de Smarteam además `tenantKey`, `companyName` e `internalResolution: { text, updatedAt, updatedBy: { name } } \| null`. |
| D4 | Mensaje | `{ id, authorType: 'cliente' \| 'smarteam' \| 'ia', authorName, body, attachments: [{ fileId, filename, contentType, size }], createdAt }`. |
| D5 | Entrada de `statusHistory` | `{ from, to, byType: 'cliente' \| 'smarteam', byName, at }`; la creación viene como `from: null, to: 'abierto'`. |
| D6 | Campos multipart | Imágenes en el campo **`images`** repetido (una parte por archivo). Los demás campos con los nombres del spec. |
| D7 | Respuesta de crear | `201` con `{ id, code }` como mínimo. El front navega al detalle con `id`. |
| D8 | Summary | `{ byStatus: { abierto, en_progreso, esperando_cliente, resuelto }, byTenant: [{ tenantKey, companyName, byStatus: {…} }] }`. |
| D9 | Códigos de error | `invalid_transition` (409), `too_many_images` (400), `invalid_image` (400, tipo no permitido), `image_too_large` (413), `page_window_exceeded` (400, bandeja > 1000), `validation_error` (400), `not_found` (404). |
| D10 | URL de las imágenes | El front la arma con los ids: cliente `/api/tickets/:id/attachments/:fileId`, Smarteam `/api/staff/tenants/:tenantKey/tickets/:id/attachments/:fileId`. Se pide con la cookie de sesión (mismo origen). |
| D11 | `contextType` y `contextId` | Valores `webhookEvent` y `syncLog` como en el modelo del spec; `contextId` es el `id` genérico del evento o sync (el de las listas del plan 3). |
| D12 | Orden | Lista del cliente y bandeja por `lastActivityAt` descendente. |

Igual que con C1 a C9, estos puntos se los paso al chat del plan 2 cuando apruebes; no escribo en el repo `SAP`.

## 2. Rutas y menú

| Ruta | Permiso (guard) | Pantalla |
|---|---|---|
| `/soporte` | `tickets.read` | Lista del cliente |
| `/soporte/nuevo` | `tickets.create` | Nuevo ticket. Acepta `?contexto=evento\|sync&id=…` (lo usará el 4c) |
| `/soporte/:id` | `tickets.read` | Detalle del cliente |
| `/bandeja` | `staff.tickets` | Bandeja de Smarteam |
| `/bandeja/:tenantKey/:id` | `staff.tickets` | Detalle de Smarteam |

- Menú (`nav.js`), en este orden: **Soporte** (`tickets.read`), **Bandeja** (`staff.tickets`), **Usuarios** (`staff.users`). Con la matriz del spec el cliente ve solo Soporte y Smarteam ve Bandeja y Usuarios.
- El inicio (`/`) ya redirige al primer ítem permitido (4a); no cambia.
- Filtros y página en la URL, igual que Usuarios (`?status=abierto&category=documentos&page=2`), para que recargar o compartir el link mantenga la vista.
- Las páginas de cada sección se cargan con `lazy()` desde `routes.jsx`. El login y el layout siguen en el paquete inicial.

## 3. Estructura nueva

```
src/
├─ components/
│  ├─ ui/textarea.jsx              # componente de shadcn (a mano, como en el 4a)
│  └─ json-viewer.jsx              # react-json-view-lite con el tema del panel
├─ features/
│  ├─ tickets/                     # piezas compartidas por cliente y Smarteam
│  │  ├─ constants.js              # estados, categorías, etiquetas, transiciones por actor
│  │  ├─ schemas.js                # Zod de ítems, detalle, mensajes, summary
│  │  ├─ images.js                 # validación de imágenes (tipo por bytes, tamaño, cantidad)
│  │  ├─ status-badge.jsx  category-label.jsx  news-dot.jsx
│  │  ├─ message-composer.jsx      # texto + imágenes (botón y Ctrl+V) + vista previa
│  │  ├─ ticket-thread.jsx         # descripción + mensajes + imágenes
│  │  ├─ attachment-gallery.jsx    # miniaturas y vista ampliada en diálogo
│  │  ├─ ticket-timeline.jsx       # abierto, primera respuesta, cambios, resuelto, reaperturas
│  │  └─ ticket-context.jsx        # contexto enlazado (evento o sync) con visor JSON
│  ├─ support/                     # cliente
│  │  ├─ api.js
│  │  ├─ support-list-page.jsx
│  │  ├─ new-ticket-page.jsx
│  │  ├─ ticket-page.jsx
│  │  └─ reopen-dialog.jsx
│  └─ inbox/                       # Smarteam
│     ├─ api.js
│     ├─ inbox-page.jsx
│     ├─ inbox-summary.jsx         # contadores por estado (también filtran)
│     ├─ staff-ticket-page.jsx
│     ├─ resolve-dialog.jsx
│     └─ internal-resolution-card.jsx
└─ mocks/
   ├─ tickets-db.js                # tickets, contadores por tenant, adjuntos
   ├─ seed-tickets.js              # ~30 tickets de ejemplo en las 3 empresas
   └─ handlers/{tickets,staff-tickets}.js
```

## 4. Decisiones de pantalla

### 4.1 Lista del cliente (`/soporte`)
- Encabezado "Soporte" con **"Nuevo ticket"** (`<Can tickets.create>`).
- Filtros: Estado (Todos + 4) y Categoría (Todas + 6).
- Columnas: Código (con punto de "respuesta nueva" si `hasNews`), Título (enlace al detalle), Categoría, Estado, Abierto por, Última actividad ("hace 2 h", con la fecha completa en `title`), Reaperturas si > 0.
- Vacío sin filtros: "Todavía no hay tickets" + botón "Nuevo ticket".

### 4.2 Nuevo ticket (`/soporte/nuevo`)
- Campos: Título (≤ 150, con contador), Categoría (selector), Descripción (≤ 5000, con contador), Imágenes.
- Si la URL trae contexto, se muestra arriba "Se enlazará el evento/sync …" y se envía `contextType`/`contextId`. Si el servidor responde 404 (no es de su empresa o no existe), se avisa y se puede crear sin contexto.
- Al crear: aviso "Ticket PRINTER-0007 creado" y navegación al detalle.

### 4.3 Imágenes (compartido por crear, responder y resolver)
- Botón "Adjuntar imágenes" (`accept="image/png,image/jpeg,image/webp"`, múltiple) y **pegar con Ctrl+V** en el formulario.
- Validación en el navegador antes de enviar, con mensaje claro por archivo: máximo 5, 5 MB cada una, y tipo comprobado por los **primeros bytes** del archivo (PNG, JPEG o WebP; SVG y lo demás se rechaza). El servidor vuelve a validar; sus errores (D9) se muestran igual.
- Vista previa en miniatura con "Quitar". Las URLs temporales (`URL.createObjectURL`) se liberan al quitar o al desmontar.

### 4.4 Detalle del cliente (`/soporte/:id`)
- Cabecera: código, título, estado, categoría, abierto por y fecha.
- Contexto (si lo hay): tipo y resumen del `snapshot` con el visor JSON plegado.
- Hilo: la descripción como primer mensaje y luego los mensajes. Los de Smarteam muestran el nombre del dev y la etiqueta "Smarteam"; los del cliente, el nombre de la persona.
- Si **no** está resuelto: caja de respuesta (`tickets.reply`). Si está `esperando_cliente`, un aviso "Smarteam espera tu respuesta".
- Si está **resuelto**: sin caja de respuesta; botón **"Sigue fallando"** (`tickets.reopen`) que abre un diálogo con mensaje obligatorio.
- Al abrir el detalle se invalida la lista (el servidor marcó `clientLastSeenAt`, así que el punto de novedad desaparece).

### 4.5 Bandeja (`/bandeja`)
- **Contadores** arriba (Abierto, En progreso, Esperando cliente, Resuelto) desde `summary`. Hacer clic en uno filtra por ese estado; el activo se marca.
- Filtros: Estado, Empresa (selector de `GET /staff/tenants`, el endpoint C7 del 4a) y Categoría.
- Columnas: Código (con punto de novedad), Empresa, Título (enlace), Categoría, Estado, Abierto por, Última actividad, Primera respuesta ("Sin respuesta" si no hay).
- `warnings`: aviso visible "No se pudieron cargar los tickets de: X" sin ocultar el resto.
- `page_window_exceeded`: "Para ver tickets más antiguos, filtra por estado, empresa o categoría".

### 4.6 Detalle de Smarteam (`/bandeja/:tenantKey/:id`)
- Dos columnas en pantallas anchas: a la izquierda cabecera, contexto e hilo; a la derecha **acciones**, **resolución interna** y **línea de tiempo**. En pantallas angostas, una sola columna.
- Acciones según el estado (solo las transiciones permitidas por el spec):

| Estado | Acciones |
|---|---|
| `abierto` | Responder (pasa a en progreso), Resolver |
| `en_progreso` | Responder, "Esperando cliente", Resolver |
| `esperando_cliente` | Responder, Resolver |
| `resuelto` | "Volver a trabajarlo" (→ en progreso) |

- **Resolver**: diálogo con "Mensaje al cliente" (+ imágenes) y "Resolución interna (no la ve el cliente)", ambos obligatorios.
- **Resolución interna**: tarjeta con fondo distinto y el rótulo "Solo Smarteam", con autor y fecha, y "Editar".
- **Línea de tiempo**: apertura, primera respuesta, cada cambio de estado con quién y cuándo, resoluciones y reaperturas (`reopenCount`).
- Un `409 invalid_transition` (otro dev cambió el estado) muestra "El ticket cambió mientras lo veías" y recarga el detalle.

### 4.7 Etiquetas

| Valor | Texto | Insignia |
|---|---|---|
| `abierto` | Abierto | azul de marca |
| `en_progreso` | En progreso | azul pálido |
| `esperando_cliente` | Esperando cliente | naranja suave (`accent-deep` sobre `orange-50`) |
| `resuelto` | Resuelto | verde suave |
| `sincronizacion` … `otro` | Sincronización, Documentos, Precios, Mapeos, Acceso, Otro | texto |

Todos los pares de color de las insignias nuevas se agregan a `theme.test.js` (contraste AA).

## 5. Mocks (MSW)

- `tickets-db.js` sobre la `db` del 4a: tickets por tenant, contador correlativo por tenant (código `TENANT-0001`), adjuntos.
- **Adjuntos en el mock:** las imágenes subidas se guardan en memoria (un `Blob` por `fileId`) y se sirven con su `Content-Type`; el service worker de MSW intercepta también las `<img>`. Al recargar `dev:mock` las imágenes subidas en esa sesión ya no están (el resto del estado sí, en `localStorage`); la miniatura muestra "Imagen no disponible". Las imágenes del seed son PNG pequeños incluidos en el código y siempre están.
- **Los handlers aplican las reglas del spec**: tenant siempre de la sesión; ticket o imagen de otro tenant → 404; `internalResolution` **nunca** en respuestas de cliente; máquina de estados con 409; los dos textos al resolver; imágenes (cantidad, tamaño, tipo por bytes); `page × pageSize` > 1000 → 400 en la bandeja; `hasNews` por lado; `statusHistory`, `firstResponseAt`, `resolvedAt` y `reopenCount`.
- Un tenant de la bandeja se puede marcar como "caído" en el mock para probar `warnings` (solo en tests).
- **Seed:** ~30 tickets en ACME, GLOBEX e INITECH con todos los estados, varios mensajes, algunos con imágenes, uno reabierto y dos con contexto de evento o sync. Las cuentas de prueba del README ven tickets desde el primer ingreso.

## 6. Dependencias

Ninguna nueva. Se usan las ya instaladas en el 4a (`react-json-view-lite` 2.5.0 incluida). `date-fns` aporta `formatDistanceToNow` con locale `es` para "hace 2 h". El componente `textarea` de shadcn se escribe a mano como los demás (el dominio de shadcn sigue bloqueado en esta sesión).

## 7. Pasos

Mismo método que el 4a: código en la copia de trabajo de la VM, sincronizado a tu carpeta al final de cada paso; donde hay lógica, test primero. Al terminar cada paso, mensaje en el chat con qué cambió, en qué archivos y por qué. Sin `git add`, `commit` ni `push`.

### Paso 1. Base compartida
1. `ui/textarea.jsx`, `json-viewer.jsx` (tema del panel, plegado por defecto a partir del segundo nivel).
2. `features/tickets/constants.js` y `schemas.js` (D1 a D8).
3. `features/tickets/images.js` con tests: tipo por bytes (PNG, JPEG, WebP sí; SVG, GIF y un `.png` que en realidad es SVG no), tamaño, cantidad.
4. `routes.jsx` con `lazy()` por sección y `nav.js` con Soporte y Bandeja.
- **Verificación:** tests verdes; el build ya no avisa de bundle > 500 kB.

### Paso 2. Mocks de tickets
1. `tickets-db.js`, `seed-tickets.js`, `handlers/tickets.js`, `handlers/staff-tickets.js` (§5).
2. Tests de handlers: aislamiento por tenant (404), sin `internalResolution` para cliente en lista, detalle, creación, mensaje y reapertura; cada transición válida y un 409 por cada inválida; los dos textos al resolver; imágenes; `hasNews` por lado; bandeja con varios tenants, `warnings` y el tope de 1000; `summary`.
- **Verificación:** tests verdes.

### Paso 3. Componentes compartidos de tickets (TDD)
1. `status-badge`, `category-label`, `news-dot`, `attachment-gallery`, `ticket-thread`, `ticket-timeline`, `ticket-context`.
2. `message-composer`: texto con contador, imágenes por botón y por pegado, vista previa, errores por archivo.
- **Verificación:** tests verdes.

### Paso 4. Pantallas del cliente (TDD)
1. `support/api.js` (queries y mutaciones; invalidan detalle y listas).
2. `support-list-page`, `new-ticket-page`, `ticket-page`, `reopen-dialog`.
- **Verificación:** tests verdes; a mano en `dev:mock` con `usuario@acme.test`.

### Paso 5. Bandeja y detalle de Smarteam (TDD)
1. `inbox/api.js`, `inbox-summary`, `inbox-page`, `staff-ticket-page`, `resolve-dialog`, `internal-resolution-card`.
- **Verificación:** tests verdes; a mano en `dev:mock` con `smarteam@panel.test` y, en otra pestaña, el cliente, para ver el ida y vuelta (respuesta, novedad, esperando cliente, resolver, "Sigue fallando").

### Paso 6. Revisión visual
- Capturas renderizadas (como en el 4a) de la lista, el formulario con imágenes, el detalle del cliente, la bandeja y el detalle de Smarteam, en escritorio y móvil. Te las envío antes de cerrar.

### Paso 7. Cierre
- README: qué se puede probar en `dev:mock` con cada cuenta.
- Todo lo de §9 y resumen final con los supuestos D1 a D12 para el chat del plan 2.

## 8. Tests

**Lista del cliente**
1. Muestra solo los tickets de su empresa, paginados por el servidor (página, tamaño y URL como en Usuarios).
2. Filtros de estado y categoría: piden los parámetros, vuelven a la página 1 y quedan en la URL.
3. Punto de "respuesta nueva" cuando `hasNews`; desaparece después de abrir el detalle.
4. Sin `tickets.create` no hay botón "Nuevo ticket"; sin `tickets.read` la sección no está en el menú y la ruta muestra "No tienes acceso".

**Nuevo ticket**
5. Validación: título, categoría y descripción obligatorios; límites de 150 y 5000.
6. Imágenes: más de 5, más de 5 MB, SVG y un archivo `.png` que no es PNG se rechazan con su mensaje y no se envían.
7. Pegar una imagen con Ctrl+V la agrega a la vista previa; "Quitar" la saca.
8. Envía multipart con los campos de D6 y `X-Panel-Request: 1`; al crear navega al detalle y avisa el código.
9. Con `?contexto=evento&id=…` envía `contextType`/`contextId`; si el servidor responde 404 lo avisa.

**Detalle del cliente**
10. Muestra el hilo con autores ("Smarteam" en los de Smarteam) e imágenes con la URL de D10.
11. Responder en `esperando_cliente` deja el ticket en `en_progreso`.
12. Resuelto: sin caja de respuesta; "Sigue fallando" exige mensaje y deja el ticket `abierto` con una reapertura más.
13. Nunca aparece "Resolución interna", aunque la respuesta trajera ese campo por error.
14. Ticket de otra empresa o inexistente → "No encontramos lo que buscas".

**Bandeja**
15. Contadores desde `summary`; clic en un contador filtra por ese estado.
16. Filtros de estado, empresa y categoría con paginación del servidor.
17. `warnings` muestra el aviso y la lista igual se ve; `page_window_exceeded` muestra el mensaje de filtrar.
18. Sin `staff.tickets` no está en el menú y la ruta muestra "No tienes acceso".

**Detalle de Smarteam**
19. Primera respuesta: `abierto → en_progreso` y aparece "Primera respuesta" en la línea de tiempo.
20. "Esperando cliente" solo en `en_progreso`; "Volver a trabajarlo" solo en `resuelto`.
21. Resolver exige los dos textos; después el ticket queda resuelto, con la resolución interna visible y editable.
22. Editar la resolución interna la actualiza.
23. `409 invalid_transition` muestra el aviso y recarga el detalle.
24. El contexto se ve con el visor JSON y se puede desplegar.

**Generales**
25. `theme.test.js` incluye los colores de las insignias nuevas.
26. `forbidden-names.test.js` y `check-build` siguen en verde con las pantallas nuevas.

## 9. Verificación final

```
npm run lint
npm run format:check
npm test
npm run test:coverage   # solo reporte
npm run build           # sin aviso de bundle > 500 kB y con check-build OK
npm run dev:mock        # recorrido manual cliente ↔ Smarteam
```

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El contrato real del plan 2 difiere de D1 a D12. | Todo el contrato vive en `features/tickets/schemas.js` y los `api.js`; Zod avisa en el punto de entrada (`invalid_response`) y los mocks se ajustan al cerrar el plan 2. |
| Imágenes: las `<img>` llevan la cookie, pero si el backend respondiera 401 la imagen solo se vería rota. | Las miniaturas muestran "Imagen no disponible" con `onError`; la sesión vencida igual se detecta en la siguiente request de datos. |
| Imágenes grandes en el navegador. | Límite de 5 MB y 5 por mensaje antes de enviar; miniaturas con `loading="lazy"` y tamaño fijo. |
| Varios devs sobre el mismo ticket. | El servidor decide (409); el front recarga y avisa. |
| En el mock, las imágenes subidas se pierden al recargar. | Solo afecta a `dev:mock`; se avisa en el README. |

## 11. Decisiones por defecto (cambiables antes de aprobar)

1. Rutas `/soporte`, `/soporte/nuevo`, `/soporte/:id`, `/bandeja`, `/bandeja/:tenantKey/:id`.
2. Orden del menú: Soporte, Bandeja, Usuarios. Smarteam entra a la Bandeja; el cliente, a Soporte.
3. Supuestos de contrato D1 a D12, incluido el campo multipart `images` repetido y que el front no use el cuerpo de las mutaciones.
4. Validación de imágenes también en el navegador (tipo por bytes, tamaño y cantidad), además de la del servidor.
5. Sin refresco automático en vivo en esta fase.
6. "Volver a trabajarlo" disponible para Smarteam en tickets resueltos (transición `resuelto → en_progreso` del spec).
7. Carga diferida (`lazy`) de las pantallas por sección.
8. La entrada con contexto (`?contexto=…&id=…`) queda lista aquí; los botones que la usan llegan en el 4c.
