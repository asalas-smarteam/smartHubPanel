# Plan 4y — SLA con cuenta regresiva en la Bandeja

Aprobado el 04-11-2026. Solo Smarteam. Hecho con agentes (lógica, UI y revisión).

## Reglas

En horario hábil (lunes a viernes, 8:00 a 17:00, hora de Costa Rica), desde `openedAt`:

- Primera respuesta: 2 h hábiles (se cumple con `firstResponseAt`).
- Resolución: 18 h hábiles, 2 días de 9 h (se cumple con `resolvedAt` si el estado es
  `resuelto`; un ticket reabierto vuelve a contar como pendiente).
- "Por vencer" con 30 min o menos. Fechas inválidas: estado `unknown`, se muestra "—".

No pausa en "Esperando cliente" ni reinicia al reabrir (necesitaría datos del backend).

## Pantallas

- Bandeja: columna "SLA" después de "Estado" ("Responder en 1 h 20", "Respuesta vencida hace
  3 h", "Resolver en 1 d 4 h", "En plazo", "Fuera de plazo"); fila vencida con borde y fondo
  rojo. Se actualiza cada minuto (`useNow` + `SlaNowContext`).
- Detalle de Smarteam: tarjeta "SLA" con las dos metas ("vence hoy 10:30 · en 1 h 20",
  "cumplida en 1 h 05"…). Fechas en hora de Costa Rica.

## Archivos

- `src/lib/business-time.js` (movido desde `src/mocks/`; + `addBusinessSeconds`), `src/lib/use-now.js`.
- `src/features/inbox/sla.js`, `sla-format.js`, `sla-now-context.js`, `sla-badge.jsx`,
  `sla-card.jsx`.
- `src/components/data-table/data-table.jsx`: props `rowClassName` y `rowAttributes`.
- `inbox-page.jsx`, `staff-ticket-page.jsx`; `src/mocks/handlers/metrics.js` (import).
- Tests de todo lo anterior (también con otra zona horaria de la máquina).
