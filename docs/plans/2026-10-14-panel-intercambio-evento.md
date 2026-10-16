# Plan 4i: lo recibido, lo enviado y la respuesta en el detalle del evento

- **Estado:** aprobado y ejecutado (14-10-2026). El backend implementó H1 (plan 5c) y se verificó en vivo con Printer: las tres partes llegan, sin credenciales ni `sapCalls` para el cliente.
- **Origen:** pedido del usuario: ver en el panel las tres columnas del Excel que hoy se les manda a
  los clientes ("Recibido de …", "Enviado a …", "Respuesta de …").

## Front

- El detalle del evento reemplaza "Evento (JSON)" por la sección **"Intercambio"** con tres
  tarjetas: **Recibido del CRM**, **Enviado al ERP**, **Respuesta del ERP**. En pantallas grandes
  (≥ 1280 px) van en tres columnas; en las demás, una debajo de otra. Cada una con su visor JSON
  (desplegado, con scroll propio).
- Cliente y Smarteam leen lo mismo: el campo nuevo `exchange` (nombres genéricos; el front no lee
  los nombres internos de la auditoría).
- Smarteam (con `staff.events.raw`): las tarjetas sueltas "Payload" y "Auditoría" se reemplazan por
  una tarjeta plegada **"Auditoría completa"** con `audit` crudo (llamadas al ERP, respuesta del CRM…).
- Mientras el backend no mande `exchange`: si llega `payload` (Smarteam), "Recibido del CRM" lo
  usa; las otras dos dicen "Sin datos".

## Pedido al backend (contrato)

En `GET /events/:id` (cliente) y `GET /staff/tenants/:tenantKey/events/:id` (Smarteam), un campo nuevo:

```json
"exchange": {
  "received": { "...": "payload del evento, tal cual" },
  "sent":     { "...": "audit.payloadSap" },
  "response": { "...": "audit.responseSap" }
}
```

- Cada parte puede ser `null` (por ejemplo, si el evento no llegó a enviarse).
- **Cliente:** sin campos de credenciales. En las respuestas del ERP hay contactos con `Password`
  (ej. `"Password": "12017"`): quitar las claves que sean contraseñas, tokens o secretos
  (`Password`, `password`, `token`, `secret`…) a cualquier profundidad. Sin `sapCalls` ni
  rutas/hosts internos (ya saneados en el plan 5).
- **Smarteam:** `exchange` igual (puede ir sin sanear) y `payload`/`audit` como hoy con
  `staff.events.raw`.
- Solo en el detalle (no en la lista).
