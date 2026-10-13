import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Fecha y hora en español, en la zona horaria del navegador: "12 oct 2026, 14:05".
 * @param {string | null | undefined} iso
 * @param {string} [empty] Texto si no hay fecha.
 */
export function formatDateTime(iso, empty = '—') {
  if (!iso) return empty
  const date = parseISO(iso)
  return isValid(date) ? format(date, 'd MMM yyyy, HH:mm', { locale: es }) : empty
}

/**
 * Tiempo relativo en español: "hace 2 horas".
 * @param {string | null | undefined} iso
 * @param {string} [empty]
 */
export function formatRelative(iso, empty = '—') {
  if (!iso) return empty
  const date = parseISO(iso)
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true, locale: es }) : empty
}

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Inicio de un día (`YYYY-MM-DD`) en la hora del navegador, en ISO UTC, más `addDays` días.
 * Devuelve undefined si el texto no es una fecha válida.
 * @param {string | null | undefined} day
 * @param {number} [addDays]
 */
export function startOfLocalDayISO(day, addDays = 0) {
  const match = DAY_PATTERN.exec(day ?? '')
  if (!match) return undefined
  const [, year, month, date] = match.map(Number)
  const value = new Date(year, month - 1, date + addDays)
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
}

/**
 * Filtro "desde / hasta" de la URL → `{ from, to }` para la API (contrato E3):
 * `from` inclusivo (inicio de "desde") y `to` exclusivo (inicio del día siguiente a "hasta").
 * @param {{ desde?: string, hasta?: string }} range
 */
export function dayRangeToQuery({ desde, hasta }) {
  return { from: startOfLocalDayISO(desde), to: startOfLocalDayISO(hasta, 1) }
}

/**
 * Duración legible entre dos fechas ISO: "4 min 12 s", "1 h 05 min", "35 s".
 * @param {string | null | undefined} startIso
 * @param {string | null | undefined} endIso
 */
export function formatDuration(startIso, endIso, empty = '—') {
  if (!startIso || !endIso) return empty
  const ms = parseISO(endIso).getTime() - parseISO(startIso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return empty
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`
}
