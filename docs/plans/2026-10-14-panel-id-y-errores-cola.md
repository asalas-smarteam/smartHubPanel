# Plan 4g: id visible y corridas con fallos sin detalle

- **Estado:** aprobado y ejecutado (14-10-2026). El backend respondió con G7 (plan 5b, en `06-ajustes-plan-5.md`) y se verificó en vivo con Printer: errores derivados, `total` = fallidos y enlace al evento.
- **Origen:** revisión en vivo con Printer (corrida de "Cola de eventos" con 1 fallido, mensaje
  "1 error(es) en la corrida" y pestaña Errores vacía) y pedido de mostrar el id de base de datos.

## Causa del problema de la corrida (backend, solo lectura)

La cola de eventos (`webhookProcessorRunner.service.js`) guarda el detalle de cada fallo en
`errorMessage` como lista de entradas `{ payload_Hubspot, payload_SAP, response_hubspot, response_SAP }`
y nunca llena `errors`. La vista de cliente (`operationViews.js`, `clientSyncErrorMessage`) resume
esa lista en `{ summary: "N error(es) en la corrida" }` y `errors.total` sale 0. El mensaje real
existe (`response_SAP.message`), pero no le llega al cliente.

## Qué cambia en el front

| # | Cambio |
|---|---|
| 1 | Componente `CopyableId`: id en monoespaciada + botón "Copiar id" (aviso "Copiado" por `aria-live`). |
| 2 | Detalle de corrida: fila **Id** en la tarjeta de fechas con `CopyableId`. Detalle de evento: la fila Id existente pasa a `CopyableId`. Cliente y Smarteam. |
| 3 | Registro enlazado en tickets (nuevo ticket y contexto del detalle): muestra el id del evento o de la corrida con `CopyableId`. |
| 4 | Pestaña Errores de la corrida: si `counts.failed > 0` y no hay errores, el vacío dice **"Sin detalle de errores"** y "La corrida registró N fallido(s), pero no guardó el detalle. Si necesitás ayuda, reportá el problema: el id de la corrida va incluido." "Esta corrida no tuvo errores" queda solo para `failed = 0`. |
| 5 | Si el backend agrega `eventId` a los errores (pedido abajo), la columna Registro enlaza al detalle del evento. Si no viene, se tolera. |

Mocks: corrida de la cola con fallo y sin `errors` (ya existe `sync-acme-q05`) y otra con errores
derivados. Tests de cada punto; lint, prettier y build.

## Pedido al backend

En la capa del panel (sin tocar cómo la integración escribe en `SyncLogs`): cuando una corrida
tiene `errors` vacío y `errorMessage` es la lista de entradas de la cola, derivar `errors.items`
de esa lista, con `record` = id del negocio (`payload_Hubspot.deal.hs_object_id`), `message` =
`response_SAP.message` o `response_hubspot.message` (saneado para cliente) y, si se puede, `eventId`.
`errors.total` debe coincidir con `counts.failed`, y el `summary` puede incluir el primer mensaje.
