# Plan 4h: filas clicables, JSON del evento y contexto del ticket sin JSON

- **Estado:** aprobado y ejecutado (14-10-2026).
- **Origen:** revisión del usuario en vivo (Eventos y tickets de Printer).

| # | Cambio |
|---|---|
| 1 | `DataTable` acepta `rowHref(row)`: toda la fila abre el detalle. El enlace del texto se mantiene (teclado, lector de pantalla, abrir en otra pestaña); clic sobre un enlace, botón o con texto seleccionado no navega; Ctrl/Cmd+clic o clic central abre en otra pestaña. Se usa en **Eventos** y **Syncs**. |
| 2 | Detalle del evento: tarjeta **"Evento (JSON)"** con el objeto del evento (sin `payload` ni `audit`, que siguen en sus tarjetas, solo Smarteam con `staff.events.raw`). Cliente y Smarteam. |
| 3 | Ticket (Soporte y Bandeja): el registro enlazado deja de mostrar el JSON. Muestra id copiable, causa (si hay), el error resumido y el enlace **"Ver evento" / "Ver sync"** (con `?empresa=` en la Bandeja). |

Tests de cada punto; lint, prettier, build.
