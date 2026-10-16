# Ajustes por el backend real (planes 1 a 3 del backend)

- **Estado:** aprobado (13-10-2026) y ejecutado.
- **Origen:** revisión de solo lectura con la cuenta cliente de Printer contra el backend local
  (planes 1 a 3 implementados): algunas respuestas reales difieren de los mocks.

## Cambios

| # | Qué pasaba con datos reales | Ajuste en el front |
|---|---|---|
| 1 | Las corridas de Printer llegan con `task: null`: Syncs no cargaba (respuesta inválida). | `task` acepta `null`; lista, detalle y contexto de ticket muestran "Tarea no disponible". |
| 2 | Un estado de evento no traducido llega como `status: null`. | Se acepta y se muestra la insignia "Desconocido" (también en los pasos del Inicio). |
| 3 | El backend devuelve `null` en nombres de personas si faltan (`createdBy.name`, `authorName`, `byName`, `updatedBy.name`). | El esquema los convierte en "Sin nombre" en vez de rechazar toda la lista. |
| 4 | Eventos y Syncs no dejan pasar de página × tamaño > 10 000 (Printer tiene 55 536 corridas). | `DataTable` acepta `maxResults`: la paginación no pasa de la ventana y avisa "Se pueden recorrer los primeros 10.000. Para ver registros más antiguos, filtra por fechas." |
| 5 | Filtros desconocidos (`status`, `category`, `taskId` que no es ObjectId) dan 400. | Las pantallas ignoran valores desconocidos de la URL (`pickOption`). |
| 6 | El backend limita el nombre de usuario a 100 caracteres; el front decía 120. | Máximo 100 en el formulario. |
| 7 | El detalle de evento y de corrida de Smarteam mostraba la clave interna (`sap_integration_…`). | Muestra el nombre de la empresa. |

Mocks alineados: ids de tarea como ObjectId, `taskId` inválido → 400 "Tarea inválida.", ventana de
10 000 en eventos y syncs. Tests en `src/app/real-backend.test.jsx`.
