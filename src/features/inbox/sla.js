// SLA de tickets en horario hábil (plan 4y): primera respuesta en 2 h hábiles y resolución en
// 18 h hábiles (2 días de 9 h), contadas desde que se abrió el ticket. El horario hábil es el de
// `@/lib/business-time` (lunes a viernes de 8:00 a 17:00, hora de Costa Rica).

import { addBusinessSeconds, businessSeconds } from '@/lib/business-time'
import { formatBusinessSeconds } from '@/lib/format'

/** Metas en segundos hábiles (plan 4y). */
export const SLA_TARGETS = Object.freeze({ firstResponse: 2 * 3600, resolution: 18 * 3600 })
/** Debajo de esto, una meta pendiente se marca como "por vencer". */
export const SLA_WARNING_SECONDS = 30 * 60

// ms de una fecha ISO; null si falta o no es una fecha válida (el contrato solo garantiza texto).
const toMs = (iso) => {
  const ms = iso ? Date.parse(iso) : NaN
  return Number.isFinite(ms) ? ms : null
}

/**
 * Estado de una meta.
 * @param {{ start: string, end: string | null, target: number, now: number }} args
 *   start: ISO de inicio (openedAt); end: ISO en que se cumplió (o null si sigue pendiente);
 *   target: segundos hábiles; now: ms actuales.
 *   Si `start` no es una fecha válida el estado es 'unknown' (sin fechas ni duraciones); un
 *   `end` inválido cuenta como si no hubiera (meta pendiente).
 * @returns {{
 *   state: 'pending' | 'warning' | 'overdue' | 'met' | 'missed' | 'unknown',
 *   dueAt: number | null,          // ms: addBusinessSeconds(start, target); null si 'unknown'
 *   remainingSeconds: number|null, // hábiles que faltan (pending/warning); si no, null
 *   overdueSeconds: number|null,   // hábiles desde el vencimiento (overdue); si no, null
 *   tookSeconds: number|null,      // hábiles que tomó (met/missed); si no, null
 * }}
 */
export function goalStatus({ start, end, target, now }) {
  const startMs = toMs(start)
  const empty = { remainingSeconds: null, overdueSeconds: null, tookSeconds: null }
  if (startMs === null) return { state: 'unknown', dueAt: null, ...empty }
  const dueAt = addBusinessSeconds(startMs, target)
  const base = { dueAt, ...empty }

  const endMs = toMs(end)
  if (endMs !== null) {
    const tookSeconds = businessSeconds(startMs, endMs)
    return { ...base, state: tookSeconds <= target ? 'met' : 'missed', tookSeconds }
  }

  const elapsed = businessSeconds(startMs, now)
  if (elapsed >= target) return { ...base, state: 'overdue', overdueSeconds: elapsed - target }
  const remainingSeconds = target - elapsed
  const state = remainingSeconds <= SLA_WARNING_SECONDS ? 'warning' : 'pending'
  return { ...base, state, remainingSeconds }
}

// Un ticket reabierto puede traer un `resolvedAt` viejo: solo cuenta si sigue resuelto.
const resolutionEnd = (ticket) => (ticket.status === 'resuelto' ? ticket.resolvedAt : null)
// Fechas de cierre inválidas cuentan como si no hubiera (igual que en `goalStatus`).
const hasDate = (iso) => toMs(iso) !== null

const firstResponseGoal = (ticket, now) =>
  goalStatus({
    start: ticket.openedAt,
    end: ticket.firstResponseAt,
    target: SLA_TARGETS.firstResponse,
    now,
  })

const resolutionGoal = (ticket, now) =>
  goalStatus({
    start: ticket.openedAt,
    end: resolutionEnd(ticket),
    target: SLA_TARGETS.resolution,
    now,
  })

/**
 * Estado SLA de un ticket de la Bandeja para la columna (la meta activa).
 * - Resuelto (status 'resuelto' y resolvedAt): meta de resolución, met o missed.
 * - Sin primera respuesta: meta de primera respuesta (pending/warning/overdue).
 * - Con primera respuesta y sin resolver: meta de resolución (pending/warning/overdue).
 * Un ticket en 'resuelto' sin `resolvedAt` válido (dato incompleto) se trata como no resuelto;
 * una `firstResponseAt` inválida, como sin primera respuesta.
 * @param {{ openedAt: string, firstResponseAt: string | null, resolvedAt: string | null,
 *   status: string }} ticket
 * @param {number} now ms actuales
 * @returns {{ goal: 'firstResponse' | 'resolution' } & ReturnType<typeof goalStatus>}
 */
export function ticketSla(ticket, now) {
  if (hasDate(resolutionEnd(ticket))) return { goal: 'resolution', ...resolutionGoal(ticket, now) }
  if (!hasDate(ticket.firstResponseAt))
    return { goal: 'firstResponse', ...firstResponseGoal(ticket, now) }
  return { goal: 'resolution', ...resolutionGoal(ticket, now) }
}

/**
 * Las dos metas para la tarjeta del detalle.
 * Si el ticket se resolvió sin primera respuesta registrada (dato raro), la primera respuesta
 * queda como esté: pendiente o vencida según `now`.
 * @param {{ openedAt: string, firstResponseAt: string | null, resolvedAt: string | null,
 *   status: string }} ticket
 * @param {number} now ms actuales
 * @returns {{ firstResponse: ReturnType<typeof goalStatus>,
 *   resolution: ReturnType<typeof goalStatus> }}
 */
export function ticketSlaGoals(ticket, now) {
  return { firstResponse: firstResponseGoal(ticket, now), resolution: resolutionGoal(ticket, now) }
}

const LABELS = {
  firstResponse: { due: 'Responder en', overdue: 'Respuesta vencida hace' },
  resolution: { due: 'Resolver en', overdue: 'Resolución vencida hace' },
}

/**
 * Duración hábil del SLA (días de 9 h): "1 h 20", "1 d 4 h". Menos de un minuto no se muestra
 * en segundos: "menos de 1 min".
 * @param {number} seconds
 */
export function formatSlaDuration(seconds) {
  return seconds < 60 ? 'menos de 1 min' : formatBusinessSeconds(seconds)
}

/**
 * Texto corto de la columna: "Responder en 1 h 20", "Respuesta vencida hace 3 h",
 * "Resolver en 1 d 4 h", "Resolución vencida hace 2 h", "En plazo", "Fuera de plazo" y "—" si
 * no se puede calcular ('unknown').
 * Las duraciones son hábiles (días de 9 h).
 * @param {ReturnType<typeof ticketSla>} sla
 * @returns {string}
 */
export function slaText(sla) {
  const labels = LABELS[sla.goal]
  switch (sla.state) {
    case 'pending':
    case 'warning':
      return `${labels.due} ${formatSlaDuration(sla.remainingSeconds)}`
    case 'overdue':
      return `${labels.overdue} ${formatSlaDuration(sla.overdueSeconds)}`
    case 'met':
      return 'En plazo'
    case 'unknown':
      return '—'
    default:
      return 'Fuera de plazo'
  }
}
