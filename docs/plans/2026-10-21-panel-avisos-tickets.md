# Plan 4v — Avisos de tickets para Smarteam

Aprobado el 21-10-2026. Slack quedó en pausa el mismo día; se agregó el sonido (plan 4w, abajo).

## A. Slack (backend) — en pausa

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

## Plan 4w — Un sonido por aviso

Aprobado el 21-10-2026. Cada aviso suena **una vez**, con la pestaña visible, oculta o el
navegador minimizado. Nunca suena doble:

- Si el navegador ya deja sonar (hubo un clic o una tecla en la página, por ejemplo al activar
  "Avisos"): timbre del panel (`sound.js`, Web Audio, dos notas, sin archivo) y la notificación
  del sistema sale con `silent: true`.
- Si no (página recién recargada, sin clic): suena la notificación del sistema (sonido de
  Windows/Mac), que no necesita clic. El primer clic o tecla habilita el timbre para los próximos.
- Sin timbre habilitado y con notificaciones bloqueadas no hay forma de sonar: el botón "Avisos"
  lo indica ("Haz clic en la página para activar el sonido").

Archivos: `src/features/alerts/sound.js` (nuevo); ajustes en `use-ticket-alerts.js`,
`notify.js` y `ticket-alerts.jsx`. Tests en `src/app/plan4v.test.jsx`.
