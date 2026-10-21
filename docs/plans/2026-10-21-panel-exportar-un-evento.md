# Plan 4u — Exportar a Excel un solo evento desde su detalle

Aprobado el 21-10-2026.

## Qué

En el detalle de un evento (`/eventos/:id`), un botón "Exportar a Excel" arriba a la derecha
(junto a "Reportar problema" si el evento tiene error) que descarga solo ese evento.

## Cómo

- Mismo formato que el reporte de la lista (plan 4j): una hoja con el nombre del tipo y una fila
  con #, tipo, estado, error/motivo, fecha de proceso, recibido del CRM, enviado al ERP,
  respuesta del ERP e id. Si el evento sale "Corregido", así va en el Excel.
- Usa los datos que la página ya cargó: no hace más llamadas a la API.
- Nombre: `2026-10-21 12-30-05 Printer Event 64467708954.xlsx` (referencia; el id si no tiene).

## Archivos

- `src/features/events/export.js`: `eventFileName` (comparte la limpieza con `reportFileName`).
- `src/features/events/export-event-button.jsx`: el botón.
- `src/features/events/event-page.jsx`: lo muestra junto al título.
- Tests: `export.test.js` (nombre) y `src/app/plan4u.test.jsx` (cliente y Smarteam).
