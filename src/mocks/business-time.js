// Horario hábil de las métricas de soporte (plan 4x, contrato L1): lunes a viernes de 8:00 a
// 17:00, hora de Costa Rica. Fines de semana y fuera de horario no cuentan; feriados tampoco
// se descuentan. Misma regla que el backend.

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
/** Costa Rica no tiene horario de verano: siempre UTC−6. */
const OFFSET_MS = -6 * HOUR_MS
const OPEN_HOUR = 8
const CLOSE_HOUR = 17

/** Un día hábil completo, en segundos (9 h). */
export const BUSINESS_DAY_SECONDS = (CLOSE_HOUR - OPEN_HOUR) * 3600

/**
 * Segundos hábiles entre dos instantes (ms desde epoch). 0 si `to` no es posterior a `from`.
 * @param {number} from
 * @param {number} to
 */
export function businessSeconds(from, to) {
  if (!(to > from)) return 0
  // Se trabaja en "hora de pared" de Costa Rica.
  const start = from + OFFSET_MS
  const end = to + OFFSET_MS
  let total = 0
  for (let day = Math.floor(start / DAY_MS) * DAY_MS; day < end; day += DAY_MS) {
    const weekday = new Date(day).getUTCDay() // 0 domingo, 6 sábado
    if (weekday === 0 || weekday === 6) continue
    const open = day + OPEN_HOUR * HOUR_MS
    const close = day + CLOSE_HOUR * HOUR_MS
    const counted = Math.min(end, close) - Math.max(start, open)
    if (counted > 0) total += counted
  }
  return total / 1000
}
