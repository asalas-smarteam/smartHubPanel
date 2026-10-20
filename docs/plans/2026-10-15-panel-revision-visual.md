# Plan 4o: arreglos de la revisión visual (cierre del 4e)

Fecha: 2026-10-15. Estado: aprobado e implementado (2026-10-15).

Revisión de todas las pantallas (cliente y Smarteam) en tema oscuro y claro, a 1440 px y a
390 px (76 capturas). Sin errores en consola (fuera del 401 esperado en el login), sin scroll
horizontal de página en ninguna pantalla. La barra lateral y el fondo se ven bien al hacer
scroll (lo cortado en las capturas de página completa es de la herramienta, no del panel).

Ya hecho dentro del 4e (aprobado): las tarjetas de duración reservan dos líneas para el nombre
y el tiempo queda alineado en todas.

## Hallazgos

1. **Detalle de evento: "Tipo" muestra el código interno** (`createQuotation`) mientras el
   título y la tabla dicen "Crear cotización". Propuesta: mostrar el nombre ("Crear
   cotización") y debajo el código en chico y monoespaciado, para que Smarteam lo siga teniendo
   a mano al buscar en la base.
2. **Celular, detalle de evento, "Último error": la causa se parte en dos columnas**
   ("Artículo inexistente en / destino" al lado de "· Validación del / destino"). Propuesta: que
   la causa y su grupo fluyan como una sola línea de texto que baja de renglón normalmente.
3. **Celular, Métricas, "Resueltos por semana": el gráfico se corta a la derecha** sin señal de
   que se puede deslizar, y arranca en las semanas más viejas. Propuesta: que en pantallas
   angostas arranque mostrando las semanas más recientes y tenga un degradado en el borde que
   indique que hay más.

Archivos: `src/features/events/event-page.jsx` (1), `src/features/causes/cause-label.jsx` (2),
`src/components/charts/column-chart.jsx` (3) y sus tests. Verificación: tests, lint, formato,
build y capturas antes/después.

## Implementación (2026-10-15)

1. `event-page.jsx`: "Tipo" muestra el nombre y, si es distinto, el código en monoespaciado.
2. `cause-label.jsx`: en línea en vez de flex; la causa y su grupo fluyen como texto.
3. `column-chart.jsx`: el scroll arranca al final (semanas recientes) y un degradado con
   `mask-image` marca el borde con columnas ocultas; se recalcula al deslizar y al cambiar el
   tamaño.

Tests: `event-page.test.jsx` (tipo con código, tipo desconocido una sola vez, causa como un
solo texto) y `charts.test.jsx` (arranca al final con degradado; sin degradado si todo entra).
