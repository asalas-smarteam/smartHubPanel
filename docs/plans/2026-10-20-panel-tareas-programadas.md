# Plan 4r: vista "Tareas programadas"

Fecha: 2026-10-20. Estado: aprobado e implementado (2026-10-20). Backend listo (plan 7, con `nextRunAt`).

Pedido: ver las tareas programadas que tiene configuradas la empresa (colección `ClientConfigs`
del backend). Solo lectura, igual que Mapeo de campos.

## Backend (pedido)

Contrato `docs/contrato-backend/09-tareas-programadas.md` (J1 a J5): `GET /scheduled-tasks` y
`GET /staff/tenants/:tenantKey/scheduled-tasks`, todas las tareas en `{ items }`, nombres
genéricos, sin credenciales ni consultas internas, permiso `tasks.read`.

## Front

1. **Menú y ruta:** "Tareas programadas" en `/tareas` (permiso `tasks.read`), después de Syncs.
   Smarteam elige la empresa como en las otras vistas.
2. **Lista** (`src/features/tasks/`): filtros Estado (Activas / Inactivas / Todas, por defecto
   Todas con las activas primero), Objeto y Tipo; resumen (tareas, activas, inactivas, con
   error). Tabla: Nombre · Objeto · Tipo · Modo (Completa / Incremental) · Horario · Estado ·
   Última corrida (con aviso si tiene error) · "Ver corridas" (a `/syncs?taskId=`). La fila abre
   el detalle.
3. **Horario en texto:** "Cada 2 min" (+ "de 08:00 a 18:00" si hay ventana) o
   "07:00, 12:00 y 15:00 · lun a sáb"; "Todos los días" si no hay días; "hora de Costa Rica"
   según `timeZone`.
4. **Detalle** `/tareas/:id` (usa la misma lista, sin otro pedido): datos generales (recurso del
   ERP, lote, asociaciones, actualiza el id del CRM en el ERP), horario, último error, filtros
   (Propiedad · Operador en texto ("es uno de", "igual a"…) · Valor · Dinámico · Por defecto ·
   Editable) y orden.
5. **Mocks y tests:** tareas de ejemplo para ACME y Globex (activas, inactivas, por intervalo y
   por horario, con error), handler de los dos endpoints, tests de lista, filtros, horario en
   texto, detalle, enlace a Syncs, Smarteam y sin permiso.

## Verificación

Tests completos, lint, formato, build; capturas oscuro/claro, escritorio y celular; en vivo cuando
el backend publique el endpoint.

## Implementación (2026-10-20)

- Permiso `tasks.read`, menú "Tareas programadas" (después de Syncs), rutas `/tareas` y
  `/tareas/:id`.
- `src/features/tasks/`: `constants.js`, `schemas.js`, `schedule.js` (horario en texto),
  `format.js` (valor y tipo de filtro), `filters.js`, `api.js`, `task-status.jsx`,
  `tasks-page.jsx` (lista con columna "Próxima" por `nextRunAt`) y `task-page.jsx` (detalle).
- Mocks: `src/mocks/seed-scheduled-tasks.js` (mismos ids que las tareas de Syncs) y
  `src/mocks/handlers/scheduled-tasks.js`.
- Tests: `schedule.test.js`, `tasks-page.test.jsx`, `nav.test.js`.
- Contratos 08 y 09: se copiaron las notas de implementación del backend.
