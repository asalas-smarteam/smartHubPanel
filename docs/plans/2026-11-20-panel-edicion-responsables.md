# Plan 5c — Editar responsables y traer los que faltan

Aprobado el 20-11-2026.

## Qué

En "Mapeo de responsables", quien tiene `owners.write` (admin del cliente y Smarteam):

- **Edita solo dos campos** de cada fila: vendedor en el ERP y empleado en el ERP (digitador).
- **"Actualizar responsables del CRM"**: trae los que falten y refresca nombre y correo. No hay
  "crear" ni "borrar" desde el panel.

El usuario normal del cliente sigue en solo lectura.

## Decisiones

- Historial de cambios en una colección de cada tenant (quién, cuándo, valor anterior y nuevo).
  El panel todavía no lo muestra.
- Vendedor: un entero o varios separados por coma (con aviso: con varios, los documentos creados
  desde el CRM salen sin vendedor). Empleado: un solo entero. Vacío = sin valor.
- **No se valida contra el ERP que el código exista: el riesgo lo asume el cliente.** El diálogo
  lo avisa antes de guardar.
- Control de versión por `updatedAt`: si otro cambió la fila, se avisa y se muestran los datos
  nuevos en lugar de pisarlos.

## Backend

Contrato `docs/contrato-backend/14-edicion-responsables.md` (O1 a O6).

## Front

- `src/features/auth/permissions.js`: `OWNERS_WRITE`.
- `src/features/owners/`: `codes.js` (validación), `edit-owner-dialog.jsx`, `api.js`
  (`useOwnerMappingActions`), `schemas.js`, `filters.js` (`syncMessage`), `owners-page.jsx`
  (columna "Editar" y botón de actualizar).
- `src/lib/api/errors.js`: `stale_update`, `erp_owner_taken`, `crm_unavailable`,
  `too_many_requests`.
- Mocks: `permissions.js` (admin con `owners.write`), `db.js`, `seed-owner-mappings.js`,
  `handlers/owner-mappings.js` (PATCH, sync e historial).
- Tests: `codes.test.js`, `owners-edit.test.jsx`, `mocks/handlers/owner-mappings.test.js`.

## Despliegue

Front y backend juntos.
