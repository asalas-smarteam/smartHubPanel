# 10. Aviso de tickets nuevos en Slack (K1 a K6)

> **En pausa (21-10-2026): no se implementa por ahora.** Smarteam decidió no enviar nada a Slack
> todavía; el aviso de tickets queda en el panel (sonido y notificación del sistema, planes 4v y
> 4w). Este documento queda como referencia para retomarlo.

Pedido del front, plan 4v (`docs/plans/2026-10-21-panel-avisos-tickets.md`). Reglas comunes en
[`00-reglas-generales.md`](00-reglas-generales.md). **No cambia ningún endpoint ni respuesta de la
API**: es un efecto secundario de crear un ticket.

## K1. Cuándo se envía

- **Solo** cuando un cliente crea un ticket (`POST /tickets`, `ClientTickets.create`), **después** de
  guardarlo con éxito.
- No se envía en respuestas, reaperturas, cambios de estado ni acciones de Smarteam.
- Si la creación falla (validación, imágenes, base de datos), no se envía nada.

## K2. Mensaje

Un solo mensaje por ticket, en el canal del webhook:

```
:ticket: *Nuevo ticket · Printer*
<https://smartspanel.smarteamcr.com/bandeja/PRINTER/6a1f...|PRN-0012 · No sincroniza cotizaciones>
```

- **Empresa:** `companyName` de `tenantDirectory.findByKey(tenantKey)`. Si no hay nombre, el
  `tenantKey`.
- **Código y título:** `ticket.code` y `ticket.title` tal como se guardaron.
- **Enlace:** `${PANEL_PUBLIC_URL}/bandeja/${encodeURIComponent(tenantKey)}/${encodeURIComponent(ticket.id)}`
  (la ruta del detalle en la Bandeja de Smarteam). Sin `PANEL_PUBLIC_URL`, la segunda línea va sin
  enlace: `PRN-0012 · No sincroniza cotizaciones`.
- **Escapar** en empresa, código y título los caracteres que Slack interpreta en `mrkdwn`:
  `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`. Así un título con `<` o `|` no rompe el enlace ni
  inyecta menciones como `<!channel>`.
- No mandar la descripción, los adjuntos, el contexto ni datos del usuario que lo creó.

Cuerpo del `POST` al webhook (JSON):

```json
{
  "text": "Nuevo ticket · Printer: PRN-0012 · No sincroniza cotizaciones",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":ticket: *Nuevo ticket · Printer*\n<https://smartspanel.smarteamcr.com/bandeja/PRINTER/6a1f...|PRN-0012 · No sincroniza cotizaciones>"
      }
    }
  ]
}
```

`text` es el respaldo que Slack usa en la notificación del celular y la vista previa.

## K3. Configuración

Dos variables nuevas en el `.env` del backend (y en `.env.example`, **vacías**):

| Variable                  | Ejemplo                                   | Sin valor                        |
| ------------------------- | ----------------------------------------- | -------------------------------- |
| `PANEL_SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/T/B/X`  | No se envía nada (ni se loguea). |
| `PANEL_PUBLIC_URL`        | `https://smartspanel.smarteamcr.com`      | El mensaje va sin enlace.        |

- La URL del webhook es un **secreto**: nunca se loguea completa, ni sale en respuestas de la API.
- Aceptar `PANEL_PUBLIC_URL` con o sin `/` final.

## K4. Que nunca afecte la creación del ticket

- El envío es **después** de responder o, si se hace antes, **sin `await`** en el camino de la
  respuesta (fire-and-forget con `.catch`). El cliente recibe su `201` aunque Slack esté caído.
- Corte a los **5 s** (`AbortSignal.timeout(5000)`). Sin reintentos.
- Si falla (timeout, red, respuesta no 2xx), solo un `logger.warn` con el `tenantKey`, el código
  del ticket y el estado HTTP. Nunca la URL del webhook.

## K5. Forma sugerida (arquitectura actual)

- Puerto `TicketNotifier` en `application/ports/panel/` con `ticketCreated({ tenantKey, ticket })`.
- Adaptador `SlackTicketNotifier` en `infrastructure/` (usa `fetch` de Node) y `NoopTicketNotifier`
  cuando no hay `PANEL_SLACK_WEBHOOK_URL`.
- `ClientTickets` recibe `ticketNotifier` y `tenantDirectory` (el mismo que ya usan
  `StaffTickets` y `StaffInbox`) desde `panel.composition.js`.
- La función que arma el mensaje (K2) pura y aparte, para testearla sin red.

## K6. Pruebas que esperamos

- Crear un ticket llama a `ticketCreated` una vez con el ticket guardado; una creación que falla no
  lo llama.
- Si el notificador rechaza o tarda, la creación igual responde `201`.
- Mensaje: empresa, código, título y enlace correctos; escapado de `&`, `<`, `>`; sin
  `PANEL_PUBLIC_URL` no hay enlace; sin `companyName` usa el `tenantKey`.
- Sin `PANEL_SLACK_WEBHOOK_URL` no se hace ninguna llamada de red.

## Configurar el webhook en Slack (lo hace Smarteam)

1. Entrar a <https://api.slack.com/apps> → **Create New App** → **From scratch**. Nombre, por
   ejemplo, "Panel de soporte"; elegir el workspace.
2. En el menú de la app: **Incoming Webhooks** → activar **Activate Incoming Webhooks**.
3. **Add New Webhook to Workspace** → elegir el canal de tickets → **Allow**.
4. Copiar la URL (`https://hooks.slack.com/services/...`) en `PANEL_SLACK_WEBHOOK_URL` del `.env`
   del backend en el VPS, agregar `PANEL_PUBLIC_URL=https://smartspanel.smarteamcr.com` y
   reconstruir: `docker compose up -d --build`.
5. Probar creando un ticket con una cuenta de cliente.
