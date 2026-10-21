# Plan 4v — Avisos de tickets para Smarteam

Aprobado el 21-10-2026. Sin sonido (los navegadores no dejan sonar sin un clic previo en la
página); el aviso que llega siempre es el de Slack.

## A. Slack (backend)

Contrato `docs/contrato-backend/10-aviso-slack.md` (K1 a K6): cuando un cliente crea un ticket, el
backend manda al canal "Nuevo ticket · Empresa" con el código y el título enlazados al ticket en
la Bandeja. Webhook y URL del panel por `.env` (`PANEL_SLACK_WEBHOOK_URL`, `PANEL_PUBLIC_URL`);
si Slack falla, el ticket se crea igual. Solo tickets nuevos.

## B. Notificación del sistema (front)

- Botón "Avisos" (campana) en la barra, solo con `staff.tickets`. El clic pide permiso de
  notificaciones; queda recordado en el navegador (`localStorage`, `panel-alerts`).
- Activado, revisa `GET /staff/tickets` (página 1, 25 más recientes) cada minuto, también en
  segundo plano. Avisa tickets nuevos (`openedAt` posterior a la revisión anterior) y respuestas
  del cliente (`hasNews` con actividad posterior). Compara fechas del servidor. La primera
  revisión no avisa.
- Aviso: notificación de Windows/Mac (clic → el ticket, o la Bandeja si son varios), aviso en el
  panel con "Ver" y la Bandeja se actualiza. Con varias pestañas, cada novedad se avisa una vez.
- Con las notificaciones bloqueadas, avisa solo dentro del panel y el botón lo indica.
- Solo con el panel abierto (aunque esté minimizado).

## Archivos

- `src/features/alerts/detect.js`, `notify.js`, `use-ticket-alerts.js`, `ticket-alerts.jsx`.
- `src/components/layout/app-layout.jsx`: el botón en la barra.
- Tests: `src/features/alerts/detect.test.js`, `src/app/plan4v.test.jsx`.
