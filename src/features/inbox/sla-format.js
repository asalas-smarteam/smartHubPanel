// Fechas del SLA (plan 4y) para la Bandeja y el detalle. Van en hora de Costa Rica, la del
// horario hábil en que se cuentan las metas, sin importar la zona del navegador.

import { BUSINESS_DAY_SECONDS, BUSINESS_TIME_ZONE } from '@/lib/business-time'
import { formatBusinessSeconds } from '@/lib/format'

import { SLA_TARGETS } from './sla'

const DAY_MS = 86_400_000

const PARTS = new Intl.DateTimeFormat('es', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Partes de la fecha en hora de Costa Rica (sin los puntos de las abreviaturas). */
function crParts(ms) {
  const parts = {}
  for (const { type, value } of PARTS.formatToParts(ms)) parts[type] = value.replaceAll('.', '')
  return parts
}

const dayKey = (ms) => {
  const { year, month, day } = crParts(ms)
  return `${year}-${month}-${day}`
}

const clock = (parts) => `${parts.hour}:${parts.minute}`

/** Vencimiento completo en hora de Costa Rica: "mié 4 nov, 10:30". */
export function formatDueAt(ms) {
  const parts = crParts(ms)
  return `${parts.weekday} ${parts.day} ${parts.month}, ${clock(parts)}`
}

/**
 * Vencimiento relativo a `now`, por día calendario de Costa Rica (sin horario de verano: un día
 * son siempre 24 h): "hoy 10:30", "mañana 09:00", "ayer 16:00" o "lun 9 nov, 10:30".
 */
export function formatDueDay(ms, now) {
  const key = dayKey(ms)
  const time = clock(crParts(ms))
  if (key === dayKey(now)) return `hoy ${time}`
  if (key === dayKey(now + DAY_MS)) return `mañana ${time}`
  if (key === dayKey(now - DAY_MS)) return `ayer ${time}`
  return formatDueAt(ms)
}

const resolutionDays = SLA_TARGETS.resolution / BUSINESS_DAY_SECONDS

/** "Metas en horario hábil: respuesta 2 h, resolución 2 días (L-V 8:00 a 17:00, hora de Costa Rica)." */
export const SLA_GOALS_NOTE =
  `Metas en horario hábil: respuesta ${formatBusinessSeconds(SLA_TARGETS.firstResponse)}, ` +
  `resolución ${resolutionDays} ${resolutionDays === 1 ? 'día' : 'días'} ` +
  '(L-V 8:00 a 17:00, hora de Costa Rica).'
