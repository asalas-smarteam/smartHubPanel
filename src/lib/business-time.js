// Horario hábil del soporte (plan 4x, contrato L1; SLA del plan 4y): lunes a viernes de 8:00 a
// 17:00, hora de Costa Rica. Fines de semana y fuera de horario no cuentan; feriados tampoco
// se descuentan. Misma regla que el backend.

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
/** Costa Rica no tiene horario de verano: siempre UTC−6. */
const OFFSET_MS = -6 * HOUR_MS
const OPEN_HOUR = 8
const CLOSE_HOUR = 17

/** Zona horaria del horario hábil y de las metas del SLA. */
export const BUSINESS_TIME_ZONE = 'America/Costa_Rica'

/** Un día hábil completo, en segundos (9 h). */
export const BUSINESS_DAY_SECONDS = (CLOSE_HOUR - OPEN_HOUR) * 3600

const isWeekend = (day) => {
  const weekday = new Date(day).getUTCDay() // 0 domingo, 6 sábado
  return weekday === 0 || weekday === 6
}

/**
 * Segundos hábiles entre dos instantes (ms desde epoch). 0 si `to` no es posterior a `from` o
 * si alguno no es finito (NaN, Infinity).
 * @param {number} from
 * @param {number} to
 */
export function businessSeconds(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(to > from)) return 0
  // Se trabaja en "hora de pared" de Costa Rica.
  const start = from + OFFSET_MS
  const end = to + OFFSET_MS
  let total = 0
  for (let day = Math.floor(start / DAY_MS) * DAY_MS; day < end; day += DAY_MS) {
    if (isWeekend(day)) continue
    const open = day + OPEN_HOUR * HOUR_MS
    const close = day + CLOSE_HOUR * HOUR_MS
    const counted = Math.min(end, close) - Math.max(start, open)
    if (counted > 0) total += counted
  }
  return total / 1000
}

/**
 * Instante (ms desde epoch) en que se cumplen `seconds` segundos hábiles contando desde `from`.
 * Inversa de `businessSeconds`: `businessSeconds(from, addBusinessSeconds(from, s)) === s`
 * para `s > 0`.
 *
 * - Si `from` cae fuera de horario o en fin de semana, la cuenta arranca en la próxima apertura
 *   (lunes a viernes 8:00).
 * - Si el plazo se cumple justo al cierre, devuelve las 17:00 de ese día (no la apertura
 *   siguiente).
 * - Con `seconds <= 0` no hay nada que contar: devuelve `from` si está en horario y, si no, la
 *   próxima apertura. El horario es [8:00, 17:00): a las 17:00 en punto ya se considera cerrado.
 * - Con `from` o `seconds` no finitos devuelve `NaN`.
 * @param {number} from
 * @param {number} seconds segundos hábiles
 * @returns {number}
 */
export function addBusinessSeconds(from, seconds) {
  if (!Number.isFinite(from) || !Number.isFinite(seconds)) return NaN
  let remaining = Math.max(0, seconds) * 1000
  // Se trabaja en "hora de pared" de Costa Rica.
  let cursor = from + OFFSET_MS
  for (;;) {
    const day = Math.floor(cursor / DAY_MS) * DAY_MS
    const open = day + OPEN_HOUR * HOUR_MS
    const close = day + CLOSE_HOUR * HOUR_MS
    if (isWeekend(day) || cursor >= close) {
      // Al día siguiente, antes de la apertura: la próxima vuelta lo lleva a las 8:00.
      cursor = day + DAY_MS
      continue
    }
    if (cursor < open) cursor = open
    const available = close - cursor
    if (remaining <= available) return cursor + remaining - OFFSET_MS
    remaining -= available
    cursor = day + DAY_MS
  }
}
