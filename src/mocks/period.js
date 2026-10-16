// Períodos de los endpoints de resumen (contrato F4, F9): días locales en la zona del usuario,
// semanas desde el lunes y medianas. Solo los usa la API simulada.

const DAY_MS = 86_400_000
const MAX_PERIOD_MS = 366 * DAY_MS + 3_600_000 // margen de una hora por cambios de horario

/** Zona IANA válida. */
function isTimeZone(tz) {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * `from`, `to` (obligatorios, ISO, `to` exclusivo) y `tz` de la consulta.
 * Devuelve `{ from, to, tz }` (fechas en ms) o null si algo es inválido.
 * @param {URLSearchParams} searchParams
 */
export function readPeriod(searchParams) {
  const from = Date.parse(searchParams.get('from') ?? '')
  const to = Date.parse(searchParams.get('to') ?? '')
  const tz = searchParams.get('tz')
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null
  if (to - from > MAX_PERIOD_MS || !isTimeZone(tz)) return null
  return { from, to, tz }
}

const formatters = new Map()

/** Fecha local `YYYY-MM-DD` de un instante (ms) en la zona `tz`. */
export function localDate(ms, tz) {
  if (!formatters.has(tz)) {
    formatters.set(
      tz,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    )
  }
  return formatters.get(tz).format(ms)
}

/** `YYYY-MM-DD` más `days` días (calendario, sin zonas). */
export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Lunes de la semana de una fecha `YYYY-MM-DD`. */
export function mondayOf(date) {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0 = domingo
  return addDays(date, -((weekday + 6) % 7))
}

/** Todos los días locales del período `[from, to)`, en orden. */
export function eachLocalDay(from, to, tz) {
  const last = localDate(to - 1, tz)
  const days = []
  for (let day = localDate(from, tz); day <= last; day = addDays(day, 1)) days.push(day)
  return days
}

/** Mediana redondeada a entero; null si no hay valores. */
export function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return Math.round(value)
}
