# Plan 4l: "En progreso" al abrir el ticket y duración promedio en Syncs y Eventos

Fecha: 2026-10-15. Estado: aprobado e implementado (2026-10-15). Falta el cambio del backend de la parte A.

Decisiones de Deiver (2026-10-15): A lo decide el front y el backend solo permite la
transición; la card extra es el promedio general (ponderado); en Eventos entran todos los
terminados; el rango sigue los filtros de la página (tope 1.000).

## A. El ticket pasa a "En progreso" cuando Smarteam lo abre

Hoy: un ticket `abierto` cambia a `en_progreso` solo cuando Smarteam responde (lo hace el
servidor). El cambio manual de estado solo permite `en_progreso → esperando_cliente` y
`resuelto → en_progreso`.

Revisión del backend (solo lectura): `canStaffSetStatus` en `src/domain/panel/tickets.js`
rechaza `abierto → en_progreso` con 409. Por eso el front solo no alcanza.

Propuesta (la decisión la toma el front, el backend solo permite la transición):

1. Backend (cambio de una línea, lo hace el equipo de backend): agregar
   `[ABIERTO, EN_PROGRESO]` a `STAFF_MANUAL_TRANSITIONS` y su test. `firstResponseAt` no
   cambia (solo lo marca el primer mensaje), así que la métrica "primera respuesta" sigue igual.
2. Front, `src/features/inbox/staff-ticket-page.jsx`: cuando el detalle carga con estado
   `abierto`, se llama una sola vez a `POST …/status { to: 'en_progreso' }` (guardado con
   `useRef` por id, para que no se repita en re-renders ni en StrictMode). Sin toast de éxito.
   Si falla (p. ej. 409 mientras el backend no tenga el cambio), no se muestra error y la
   pantalla queda como hoy.
3. `src/features/tickets/constants.js`: actualizar el comentario de `STAFF_ACTIONS`.
4. Mock `src/mocks/handlers/staff-tickets.js`: permitir `abierto → en_progreso`.
5. Aplica tanto al hacer clic en la fila como al entrar por la URL. Solo en el panel de
   Smarteam; el cliente no dispara nada.

## B. Duración promedio en Syncs y Eventos

Datos (sin backend nuevo):
- Syncs: `finishedAt − startedAt` de las corridas terminadas (`completed` y `errored`). Las
  `running` no cuentan. Se agrupa por tarea (`task.name`); `task: null` va como
  "Tarea no disponible".
- Eventos: `updatedAt − createdAt` de los eventos terminados (`completed`,
  `destination_created`, `destination_created_origin_error`, `errored`). Es el tiempo real
  desde que llegó el evento hasta su último cambio, e incluye la espera en la cola.
  Se agrupa por tipo, con las mismas etiquetas de la tabla.

Cálculo en el front:
- Nuevo `src/lib/durations.js`: `durationStats(items, { key, start, end })` devuelve por
  grupo `{ label, count, averageMs }` y el total; `formatDuration(ms)` → "850 ms", "12 s",
  "3 min 20 s", "1 h 05 min".
- Sigue los filtros de la página (fechas, estado, tarea/tipo, empresa). Toma las
  corridas/eventos más recientes del filtro hasta un tope de 1.000 (mismo paginado que
  "Corregidos"); si se llega al tope, una nota lo dice.
- Query propia con TanStack Query (no frena la tabla); sin datos → "Sin corridas terminadas
  en este filtro".

UI (encima de la tabla, en cada página):
- Card "Duración promedio": una fila por tarea (Syncs) o por tipo (Eventos) con el promedio
  y cuántas corridas/eventos lo forman, ordenadas de mayor a menor duración.
- Card extra "Promedio general": promedio de todas las corridas/eventos juntos (ponderado
  por cantidad), con el total de corridas/eventos que lo forman.
- Móvil: las cards se apilan; escritorio: grilla de 2 columnas.

Archivos: `src/lib/durations.js` (+ test), `src/features/syncs/durations-card.jsx`,
`src/features/events/durations-card.jsx` (o una sola compartida en `src/components/`),
`syncs-page.jsx`, `events-page.jsx`, `syncs/api.js`, `events/api.js`, tests de página.

## Verificación

Tests unitarios y de página, `vitest` completo por shards, prettier, eslint, `vite build`;
capturas en modo mock (oscuro y claro); prueba en vivo en `localhost:5173` con la cuenta de
Smarteam (la parte A en vivo depende del cambio del backend).

## Implementación (2026-10-15)

- A: `staff-ticket-page.jsx` (efecto con `useRef`), mock con `abierto → en_progreso`,
  comentario de `STAFF_ACTIONS`; tests en `staff-ticket-page.test.jsx` (abre → en progreso sin
  `firstResponseAt`; otro estado no pide nada; 409 sin aviso ni reintento).
- B: `src/lib/durations.js`, `formatMilliseconds` en `src/lib/format.js`,
  `src/lib/api/fetch-pages.js` (paginado compartido; `fetchEventPages` lo usa),
  `src/components/charts/duration-summary.jsx` (renglón por grupo: nombre y promedio, barra y
  cantidad; se lee bien en el celular), `useSyncDurations` y `useEventDurations`,
  `collectEventsWithCorrections` devuelve `capped`. Tests: `src/app/plan4l.test.jsx`,
  `src/lib/durations.test.js`, `format.test.js`; `recordRequests` acepta `ignore` (`isBulkPage`).
