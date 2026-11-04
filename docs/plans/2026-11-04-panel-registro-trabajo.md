# Plan 4z — Registro de trabajo desde Claude

Aprobado el 04-11-2026. Solo Smarteam.

## Qué

La skill de Claude `registro-tiempo`, que usan los devs de Smarteam al cerrar una tarea, publica
en el ticket del panel, en una sola llamada:

- un **resumen para el cliente**, como respuesta pública de Smarteam;
- un **registro interno de horas** (horas, nota técnica y, opcional, el id del proyecto en el
  CRM), que solo ve Smarteam.

Para autenticarse usa un **token personal** que el dev crea en Mi cuenta ▸ Tokens de API.

## Reglas

- Tokens: `spn_` + 43 caracteres base64url (32 bytes); vencen a los 90 días; máximo 5 activos por
  cuenta; el valor se ve una sola vez al crearlo. Crear uno pide nombre (1 a 60, sin caracteres
  de control) y **la contraseña actual**.
- Un token sirve solo para buscar un ticket por código y publicar el registro de trabajo; en
  cualquier otra ruta no vale (401).
- El resumen tiene los mismos efectos que una respuesta de Smarteam (primera respuesta, novedad
  para el cliente, `abierto` → `en_progreso`). Con `resolve: true` además resuelve el ticket, con
  la nota interna como resolución interna (obligatoria).
- Ticket ya resuelto → 409 y no se publica nada.
- Horas: de 0,25 a 24, en cuartos de hora. El cliente nunca ve horas ni la nota interna.
- Reintentos seguros con `Idempotency-Key` (24 h, por token).
- Cambiar la propia contraseña no revoca los tokens; desactivar al usuario o restablecerle la
  contraseña, sí.

## Endpoints (backend)

Contrato `docs/contrato-backend/12-registro-trabajo.md` (M1 a M8):

| Ruta | Auth | Para |
| --- | --- | --- |
| `GET /account/api-tokens` | cookie | Lista de tokens activos de la cuenta. |
| `POST /account/api-tokens` `{ name, currentPassword }` | cookie | Crea un token: `201 { token, item }`. |
| `DELETE /account/api-tokens/:id` | cookie | Revoca: `204`. |
| `GET /staff/tickets/by-code/:code` | token o cookie | Ticket por código (`PRINTER-0012`). |
| `POST /staff/tickets/by-code/:code/work-log` | token o cookie | Publica resumen + horas (opcional: resolver). |
| `GET /staff/tenants/:tenantKey/tickets/:id` | cookie | Detalle de Smarteam, ahora con `workLog { totalHours, entries }`. |

Errores nuevos: `invalid_token` (401), `token_limit` (409), `ambiguous_code` (409),
`request_in_progress` (409), `idempotency_key_reused` (422). Contraseña incorrecta al crear un
token: `400 invalid_current_password`, como el cambio de contraseña.

## Front (ya existe)

- Mi cuenta: `src/features/account/`
  - `account-links.js`, `account-tabs.jsx`: pestañas Contraseña y Tokens de API.
  - `api-tokens-page.jsx` (+ `api-tokens-page.test.jsx`): lista, vencimiento, revocar.
  - `create-api-token-dialog.jsx`: crear y mostrar el token una sola vez.
  - `api.js`, `schemas.js`: llamadas y esquemas (`MAX_ACTIVE_TOKENS`, `TOKEN_TTL_DAYS`,
    `TOKEN_NAME_MAX`).
  - Ruta `/cuenta/tokens` en `src/app/routes.jsx`, con permiso `staff.tickets`.
- Ticket de Smarteam: `src/features/inbox/work-log-card.jsx` (+ `work-log-card.test.jsx`),
  usada en `staff-ticket-page.jsx`; esquema `workLog` en `src/features/tickets/schemas.js`.
- Mock: `src/mocks/api-tokens.js`, `src/mocks/handlers/api-tokens.js` (+ test),
  `src/mocks/handlers/work-log.js` (+ test) y el registro de horas en `src/mocks/tickets-db.js`.

## Revisión de seguridad (aplicada)

Crear un token pide la contraseña actual; formato `spn_` + 43 base64url; la lista no muestra
vencidos ni revocados; desactivar o restablecer la contraseña de un usuario revoca sus tokens;
`Idempotency-Key` con charset fijo y huella sobre los campos normalizados; el token se ve una sola
vez y no queda en la caché de TanStack Query.

## Despliegue

Front y backend juntos.
