// Formato de cifras para tableros y métricas, en español: miles con punto, decimales con coma.
// Se fija `es` con agrupación siempre activa para que "1.234" se vea igual en todos los navegadores.

const NBSP = ' '
const EMPTY = '—'

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/**
 * Número en español: `1.234`, `12.345,5`.
 * @param {number | null | undefined} value
 * @param {string} [empty] Texto si no hay número.
 * @param {number} [maximumFractionDigits]
 */
export function formatNumber(value, empty = EMPTY, maximumFractionDigits = 1) {
  if (!isNumber(value)) return empty
  return new Intl.NumberFormat('es', { useGrouping: 'always', maximumFractionDigits }).format(value)
}

/**
 * Parte sobre total (0 a 1). `null` si no hay total.
 * @param {number | null | undefined} part
 * @param {number | null | undefined} total
 */
export function ratio(part, total) {
  if (!isNumber(part) || !isNumber(total) || total <= 0) return null
  return part / total
}

/**
 * Porcentaje de `part` sobre `total`: `87,5 %` (con espacio duro, como se escribe en español).
 * @param {number | null | undefined} part
 * @param {number | null | undefined} total
 * @param {number} [digits] Decimales máximos.
 */
export function formatPercent(part, total, digits = 1) {
  const value = ratio(part, total)
  if (value === null) return EMPTY
  return `${formatNumber(value * 100, EMPTY, digits)}${NBSP}%`
}

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Duración en segundos para tableros: `35 s`, `52 min`, `1 h 20`, `3 d 4 h`.
 * Con `compact` redondea a la unidad mayor (`11 h`), para rótulos cortos.
 * @param {number | null | undefined} seconds
 * @param {{ compact?: boolean, empty?: string }} [options]
 */
export function formatSeconds(seconds, { compact = false, empty = EMPTY } = {}) {
  if (!isNumber(seconds) || seconds < 0) return empty
  const total = Math.round(seconds)
  if (total < MINUTE) return `${total} s`
  if (compact) {
    if (total < HOUR) return `${Math.round(total / MINUTE)} min`
    if (total < DAY) return `${Math.round(total / HOUR)} h`
    return `${Math.round(total / DAY)} d`
  }
  if (total < HOUR) return `${Math.floor(total / MINUTE)} min`
  if (total < DAY) {
    const hours = Math.floor(total / HOUR)
    const minutes = Math.floor((total % HOUR) / MINUTE)
    return minutes ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${hours} h`
  }
  const days = Math.floor(total / DAY)
  const hours = Math.floor((total % DAY) / HOUR)
  return hours ? `${days} d ${hours} h` : `${days} d`
}

/**
 * Duración en milisegundos para promedios: `850 ms`, `4,2 s`, `46 s`, `3 min 20 s`, `1 h 05 min`.
 * Debajo de 10 s lleva un decimal, para que los promedios cortos no queden todos en "1 s".
 * @param {number | null | undefined} ms
 * @param {string} [empty]
 */
export function formatMilliseconds(ms, empty = EMPTY) {
  if (!isNumber(ms) || ms < 0) return empty
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 10) {
    const rounded = Math.round(seconds * 10) / 10
    if (rounded < 10) return `${formatNumber(rounded, empty, 1)} s`
  }
  const total = Math.round(seconds)
  if (total < MINUTE) return `${total} s`
  if (total < HOUR) {
    const minutes = Math.floor(total / MINUTE)
    return `${minutes} min ${String(total % MINUTE).padStart(2, '0')} s`
  }
  const hours = Math.floor(total / HOUR)
  return `${hours} h ${String(Math.floor((total % HOUR) / MINUTE)).padStart(2, '0')} min`
}
