# Plan 4c: Eventos y Syncs en el panel (+ "Reportar problema")

- **Estado:** aprobado y ejecutado (13-10-2026).
- **Spec:** `docs/specs/2026-10-12-panel-soporte-design.md`, §3 Eventos y syncs y §4 Frontend (historias E1, E2, E3, S2, S3).
- **Base:** planes 4a y 4b. Se reutilizan sesión, permisos, tabla paginada, visor JSON, tema y MSW; la entrada "Nuevo ticket" con contexto (`?contexto=evento|sync&id=…`) ya existe desde el 4b.
- **Repo:** `smartHubPanel`, rama `main`. El commit y el push los hace el usuario.
- **Depende de:** nada para empezar (API simulada). El backend la construye en su plan 3 (Eventos y syncs).

## Qué queda funcionando al terminar

1. **Eventos** (permiso `events.read`): lista paginada con filtros por estado, tipo, referencia (id del negocio) y rango de fechas; detalle con estado, reintentos y último error (E1).
2. **Syncs** (permiso `syncs.read`): lista de corridas paginada con filtros por tarea, estado y fechas; detalle con contadores, motivos de omisión, error y la lista de errores paginada con visor JSON (E2).
3. **Smarteam** ve lo mismo **por empresa**, incluidas las suspendidas, y en el detalle de un evento además el `payload` y la auditoría como JSON plegable si tiene `staff.events.raw` (E3).
4. **"Reportar problema"** en el detalle de un evento o sync con error (permiso `tickets.create`): abre "Nuevo ticket" con el registro enlazado, la categoría sugerida y un resumen del error a la vista (S2, S3).
5. Mocks con eventos y syncs de ejemplo (incluidos los que ya enlazan los tickets del seed), tests y el archivo de contrato `docs/contrato-backend/03-eventos-y-syncs.md` para el plan 3 del backend.

## Fuera de alcance

- Reintentar eventos (E4), portada de estado (E5), eventos de precios (E6), reportes de calidad (E7) y logs (E8): fases 2 y 3.
- Docker y nginx (plan 4d).

---

## 1. Contrato de API

### 1.1 Lo que el spec ya define

| Endpoint | Permiso | Uso |
|---|---|---|
| `GET /api/events?status=&type=&reference=&from=&to=&page=&pageSize=` | `events.read` | Lista del cliente (tenant de la sesión). |
| `GET /api/events/:id` | `events.read` | Detalle del cliente. **Nunca** `payload` ni `audit`. |
| `GET /api/staff/tenants/:tenantKey/events?…` y `/:id` | `events.read` (Smarteam) | Lo mismo por empresa; el detalle suma `payload` y `audit` con `staff.events.raw`. |
| `GET /api/syncs?taskId=&status=&from=&to=&page=&pageSize=` | `syncs.read` | Lista del cliente. |
| `GET /api/syncs/:id` | `syncs.read` | Detalle con `errors` paginados. |
| `GET /api/staff/tenants/:tenantKey/syncs[/:id]` | `syncs.read` (Smarteam) | Lo mismo por empresa. |

Contrato genérico del spec: evento `{ id, type, status, retries, maxRetries, lastError, reference, createdAt, updatedAt }` (+ `payload`, `audit` para Smarteam); sync `{ id, task: { id, name, type }, objectType, status, counts: { processed, sent, failed, updated, skipped }, skippedReasons, errorMessage, startedAt, finishedAt }` (+ `errors` en el detalle). Las listas de eventos excluyen los reportes de calidad (`status: 'report'`).

### 1.2 Lo que el spec no define y este plan **asume** (a confirmar en el plan 3 del backend)

Revisé los modelos del backend (`WebhookEvent.js`, `SyncLog.js`, `ClientConfig.js`) para que los supuestos calcen con lo que existe. Se escriben en `docs/contrato-backend/03-eventos-y-syncs.md` en el paso 1.

| # | Tema | Supuesto |
|---|---|---|
| E1 | **Estados de evento con nombres genéricos** | Dos estados internos llevan nombres de sistemas (`sap_order_created`, `sap_created_hubspot_error`) y no pueden salir así (regla del spec). La API los traduce: `waiting` → `waiting`, `inprocess` → `in_process`, `sap_order_created` → `destination_created`, `sap_created_hubspot_error` → `destination_created_origin_error`, `completed` → `completed`, `errored` → `errored`. El filtro `status` usa los valores traducidos. |
| E2 | Tipo de evento | `type` es el `eventType` tal cual (`createDeal`, `createQuotation`, `updateQuotation`, `updateDealStage`, …). El front muestra una etiqueta en español para los conocidos y el valor crudo para los demás. |
| E3 | Fechas de los filtros | `from` y `to` en ISO 8601 (UTC). `from` inclusivo, `to` exclusivo. El front manda el inicio del día elegido y el inicio del día siguiente, en la hora del navegador convertida a UTC. Eventos filtran por `createdAt`; syncs por `startedAt`. |
| E4 | Referencia | `reference` filtra por igualdad exacta con el id del negocio. |
| E5 | **Tipo de tarea genérico** | `task.type` traduce `SAP_SYNC` → `record_sync` y `DROPDOWN_OPTIONS` → `dropdown_options`. |
| E6 | Sync en curso | `status` vale `completed`, `errored` o **`running`** (cuando el interno es `null`: la corrida no terminó). `finishedAt` en `null` mientras corre. |
| E7 | Errores del detalle de sync | `errors: { items, page, pageSize, total }`, paginados con `?errorsPage=&errorsPageSize=` (máx. 100). Cada ítem es JSON libre. `errorMessage` puede ser texto, objeto o `null`. |
| E8 | **Endpoint nuevo: tareas** | `GET /api/sync-tasks` (cliente, `syncs.read`) y `GET /api/staff/tenants/:tenantKey/sync-tasks` (Smarteam) → `{ items: [{ id, name, type }] }`, sin paginar. Alimenta el filtro "Tarea". Solo expone `clientName` y `taskType` traducido (nunca credenciales, como dice el spec). |
| E9 | Orden | Eventos por `createdAt` descendente; syncs por `startedAt` descendente. |
| E10 | Empresa en las rutas de Smarteam | Si `:tenantKey` no existe → `404`. Las empresas suspendidas se pueden consultar. |

## 2. Alcance por sesión (cliente vs Smarteam)

Las dos cuentas tienen `events.read` y `syncs.read`, pero llaman a endpoints distintos. Para no decidir por `accountType`, el front usa el **alcance de la sesión**:

- **Con `tenantKey`** en `/auth/me` (cliente): usa `/api/events` y `/api/syncs`; la empresa es siempre la suya.
- **Sin `tenantKey`** (Smarteam): la pantalla pide primero **elegir la empresa** (selector de `GET /staff/tenants`) y usa las rutas `/api/staff/tenants/:tenantKey/…`. La empresa queda en la URL (`?empresa=ACME`).
- Mostrar `payload` y `audit` depende del **permiso** `staff.events.raw`, no del tipo de cuenta.

## 3. Rutas y menú

| Ruta | Permiso | Pantalla |
|---|---|---|
| `/eventos` | `events.read` | Lista (Smarteam: con selector de empresa) |
| `/eventos/:id` | `events.read` | Detalle (Smarteam: `?empresa=…`) |
| `/syncs` | `syncs.read` | Lista |
| `/syncs/:id` | `syncs.read` | Detalle |

- Menú: Soporte, Bandeja, **Eventos**, **Syncs**, Usuarios. El cliente ve Soporte, Eventos y Syncs; Smarteam ve Bandeja, Eventos, Syncs y Usuarios. El inicio no cambia (primer ítem permitido).
- Filtros, página y empresa en la URL, como en el 4b. Cargadas con `lazy()`.

## 4. Estructura nueva

```
src/
├─ features/
│  ├─ scope/
│  │  ├─ use-scope.js               # alcance de la sesión: empresa propia o elegida por Smarteam
│  │  └─ tenant-picker.jsx          # selector de empresa para Smarteam (empresa en la URL)
│  ├─ events/
│  │  ├─ constants.js  schemas.js  api.js
│  │  ├─ events-page.jsx
│  │  └─ event-page.jsx
│  ├─ syncs/
│  │  ├─ constants.js  schemas.js  api.js
│  │  ├─ syncs-page.jsx
│  │  └─ sync-page.jsx
│  └─ tickets/report-problem-button.jsx   # "Reportar problema" (enlace a Nuevo ticket)
├─ components/date-range-filter.jsx  # desde / hasta
└─ mocks/
   ├─ seed-events.js                 # eventos y syncs de ejemplo por empresa
   └─ handlers/{events,syncs}.js
```

`mocks/seed-tickets.js` deja de definir sus propios registros de contexto y usa los de `seed-events.js` (mismos ids: `ev-acme-001`, `sync-acme-001`, `ev-globex-001`), y la creación de tickets con contexto valida contra esos mismos datos.

## 5. Decisiones de pantalla

### 5.1 Eventos (`/eventos`)
- Smarteam sin empresa elegida: tarjeta "Elige una empresa para ver sus eventos" con el selector. Con empresa elegida, el selector queda arriba de los filtros para cambiarla.
- Filtros: Estado, Tipo (selector con los tipos conocidos + "Todos"), Referencia (texto; se aplica al presionar Enter o salir del campo) y Desde/Hasta (fechas).
- Columnas: Fecha, Tipo, Referencia, Estado, Reintentos (`2/3`), Último error (una línea, truncada, con el texto completo en `title`). Fecha y tipo enlazan al detalle.

| Estado (API) | Texto | Insignia |
|---|---|---|
| `waiting` | En cola | gris |
| `in_process` | Procesando | azul pálido |
| `destination_created` | Creado en destino | azul pálido |
| `destination_created_origin_error` | Creado en destino con error al actualizar el origen | naranja suave |
| `completed` | Completado | verde suave |
| `errored` | Con error | rojo suave (nuevo, con contraste AA en `theme.test.js`) |

### 5.2 Detalle de evento (`/eventos/:id`)
- Cabecera: tipo, estado, referencia, reintentos, creado y actualizado.
- Último error en un bloque legible (texto con saltos de línea).
- Con `staff.events.raw`: secciones **Payload** y **Auditoría** con el visor JSON plegado.
- **Reportar problema** si el estado es `errored` o `destination_created_origin_error` y el usuario tiene `tickets.create`.

### 5.3 Syncs (`/syncs`)
- Filtros: Tarea (de E8), Estado (Completada / Con error / En curso) y Desde/Hasta.
- Columnas: Inicio, Tarea, Objeto (Productos, Contactos, Negocios, Empresas, Facturas), Estado, Procesados, Enviados, Fallidos, Omitidos, Duración. Fallidos > 0 en color de error.

### 5.4 Detalle de sync (`/syncs/:id`)
- Contadores en tarjetas (procesados, enviados, actualizados, fallidos, omitidos).
- Motivos de omisión (motivo y cantidad).
- Mensaje de error: texto, o visor JSON si es un objeto.
- **Errores**: tabla paginada propia (`errorsPage` en la URL) con cada error en el visor JSON.
- **Reportar problema** si `status` es `errored` o `failed > 0`, con `tickets.create`.

### 5.5 "Reportar problema" → Nuevo ticket
- Navega a `/soporte/nuevo?contexto=evento|sync&id=…`. La categoría se sugiere: **Documentos** para eventos y **Sincronización** para syncs (editable).
- En "Nuevo ticket", el aviso del enlace pasa a mostrar un **resumen del registro** (tipo, estado y error) pidiéndolo a `/api/events/:id` o `/api/syncs/:id`. Si no existe, se mantiene el comportamiento del 4b ("Crear sin enlazarlo").
- Smarteam no ve el botón (no tiene `tickets.create`; abrir tickets en nombre del cliente es S14, Fase 2).

## 6. Mocks

- `seed-events.js`: por empresa, ~45 eventos (todos los estados, varios tipos, referencias repetidas para probar el filtro, fechas de las últimas 3 semanas, reintentos), **3 reportes de calidad** (`status: report`, que nunca deben aparecer) y ~30 syncs en 3 tareas (completadas, con error, una en curso, con motivos de omisión y errores para paginar).
- Los datos internos del mock guardan los nombres internos (`sap_order_created`, `SAP_SYNC`, `sapAudit`, `payload.deal.hs_object_id`) y **los handlers los traducen** como lo hará el backend (E1, E5, campo `reference`, `audit`). Así se prueba la traducción. Esos nombres internos viven solo en archivos del mock y se escriben armados por partes, para que el test de nombres prohibidos siga protegiendo el código de la app.
- Reglas: tenant siempre de la sesión en las rutas de cliente; otro tenant → 404; `payload`/`audit` solo con `staff.events.raw`; filtros de E3 y E4; reportes excluidos; paginación de errores (E7); `sync-tasks` (E8).

## 7. Pasos

Mismo método que el 4a y el 4b (copia de trabajo, sincronización a tu carpeta al final de cada paso, test primero donde hay lógica, mensaje por paso, sin `git add`/`commit`/`push`).

### Paso 1. Contrato y base
1. `docs/contrato-backend/03-eventos-y-syncs.md` con E1 a E10 y ejemplos JSON; enlace en el `README.md` de esa carpeta.
2. `features/scope/use-scope.js` + `tenant-picker.jsx`, `components/date-range-filter.jsx`.
3. `features/events/` y `features/syncs/`: `constants.js` (etiquetas) y `schemas.js` (Zod de E1 a E8).
4. Rutas, menú y colores de la insignia "Con error" con su test de contraste.

### Paso 2. Mocks
1. `seed-events.js`, `handlers/events.js`, `handlers/syncs.js`; `seed-tickets.js` y `handlers/tickets.js` usan los registros nuevos.
2. Tests de handlers: traducción de estados y tipos de tarea, sin `payload`/`audit` para el cliente ni para Smarteam sin `staff.events.raw`, aislamiento por tenant, filtros (estado, tipo, referencia, fechas), reportes excluidos, errores paginados, `sync-tasks`, empresa inexistente → 404.

### Paso 3. Eventos (TDD)
`events/api.js`, `events-page.jsx`, `event-page.jsx`.

### Paso 4. Syncs (TDD)
`syncs/api.js`, `syncs-page.jsx`, `sync-page.jsx`.

### Paso 5. Reportar problema (TDD)
`report-problem-button.jsx` y el resumen del registro en `new-ticket-page.jsx`.

### Paso 6. Revisión visual
Capturas de las listas y detalles (cliente y Smarteam), del flujo "Reportar problema" y de móvil.

### Paso 7. Cierre
README (qué probar en `dev:mock`), verificación completa y resumen con E1 a E10 para el chat del plan 3.

## 8. Tests

**Eventos**
1. Cliente: lista de su empresa, paginada, ordenada por fecha; nunca aparecen reportes de calidad.
2. Filtros: estado, tipo, referencia y fechas llegan a la API con los nombres y formatos de E1, E3 y E4, vuelven a la página 1 y quedan en la URL.
3. Detalle del cliente: estado, reintentos y último error; **sin** Payload ni Auditoría, aunque la respuesta los trajera por error.
4. Smarteam sin empresa elegida ve el selector y no pide eventos; al elegir, pide `/staff/tenants/:tenantKey/events`; la empresa queda en la URL; las suspendidas aparecen.
5. Smarteam con `staff.events.raw` ve Payload y Auditoría en el visor JSON; sin ese permiso, no.
6. Evento de otra empresa o inexistente → "No encontramos lo que buscas".

**Syncs**
7. Lista con contadores y estado "En curso" para la corrida sin terminar; filtros de tarea (de `sync-tasks`), estado y fechas.
8. Detalle: contadores, motivos de omisión, mensaje de error (texto u objeto) y errores paginados por separado de la lista.

**Reportar problema**
9. Aparece en eventos `errored` / `destination_created_origin_error` y en syncs con error o fallidos; no en los demás; no sin `tickets.create`.
10. Lleva a "Nuevo ticket" con contexto y categoría sugerida, muestra el resumen del registro y el ticket creado queda enlazado (visible en su detalle y en la bandeja de Smarteam).

**Generales**
11. Menú y rutas por permiso (`events.read`, `syncs.read`).
12. `theme.test.js` (insignia "Con error"), `forbidden-names.test.js` y `check-build` en verde.

## 9. Verificación final

```
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run build
npm run dev:mock        # cliente: Eventos → Reportar problema → Soporte; Smarteam: elegir empresa, ver payload/auditoría
```

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El backend no traduce estados o tipos (E1, E5) y llegan nombres internos. | Zod los rechaza (`invalid_response`) y se ve de inmediato; el contrato lo deja explícito para el plan 3. |
| Volumen de eventos alto en producción. | Paginación del servidor e índices del spec (§3, `createdAt`); filtros por fecha y referencia. |
| `payload` muy grande en el detalle de Smarteam. | Visor plegado por defecto, con altura máxima y desplazamiento. |
| Zona horaria de los filtros de fecha. | Se envía UTC calculado desde la hora del navegador (E3) y se muestra en la hora del navegador. |
| Smarteam abre un link de detalle sin `?empresa=`. | Se pide elegir la empresa; con la empresa elegida se abre el detalle. |

## 11. Decisiones por defecto (cambiables antes de aprobar)

1. Supuestos de contrato E1 a E10, incluidos los nombres genéricos de estados y tipos de tarea y el endpoint nuevo `sync-tasks`.
2. Alcance por sesión (`tenantKey` presente o no) para elegir los endpoints; permisos para todo lo demás.
3. Rutas `/eventos`, `/eventos/:id`, `/syncs`, `/syncs/:id`, con `?empresa=` para Smarteam.
4. Orden del menú: Soporte, Bandeja, Eventos, Syncs, Usuarios.
5. "Reportar problema" solo en registros con error y solo con `tickets.create`; categoría sugerida Documentos (eventos) o Sincronización (syncs).
6. Referencia como texto que se aplica con Enter o al salir del campo; fechas con selector nativo del navegador.
7. El resumen del registro enlazado en "Nuevo ticket" se pide a la API (no viaja en la URL).
