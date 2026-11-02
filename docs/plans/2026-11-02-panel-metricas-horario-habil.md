# Plan 4x — Métricas de soporte en horario hábil

Aprobado el 02-11-2026.

## Regla

Los tiempos de tickets (primera respuesta y resolución) cuentan solo de lunes a viernes, de 8:00
a 17:00, hora de Costa Rica. Fines de semana y fuera de horario no cuentan. Feriados: no se
descuentan por ahora.

## Backend

Contrato `docs/contrato-backend/11-metricas-horario-habil.md` (L1 a L5): `businessSeconds` en
`ticketMetrics.js`, rangos en días hábiles de 9 h (claves sin cambio), misma forma de respuesta.

## Front

- `src/lib/format.js`: `formatBusinessSeconds` (días de 9 h: 20 h → "2 d 2 h").
- Métricas (`metrics-page.jsx`, `summaries.js`) y la tarjeta "Tu soporte" del Inicio
  (`support-card.jsx`) muestran los tiempos en tiempo hábil.
- Nota en Métricas: "Tiempos en horario hábil: lunes a viernes de 8:00 a 17:00 (hora de Costa
  Rica)." Rangos: "Menos de 4 h", "4 h a 1 día hábil", "1 a 3 días hábiles", "Más de 3 días
  hábiles". Resumen: "… en menos de un día hábil".
- Mock: `src/mocks/business-time.js` y `handlers/metrics.js` con la misma regla.
- Tests: `format.test.js`, `business-time.test.js`, `handlers/metrics.test.js`,
  `summaries.test.js`, `metrics-page.test.jsx`.

## Despliegue

Front y backend juntos.
