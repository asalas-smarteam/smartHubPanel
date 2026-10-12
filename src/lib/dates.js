import { format, isValid, parseISO } from 'date-fns'
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
