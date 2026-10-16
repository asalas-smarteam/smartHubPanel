// Frases de resumen del Inicio, armadas en el front a partir de los números (plan 4e §3.1).
// Reglas simples: si no aplican, devuelven null y la frase no se muestra.
import { format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

import { formatDayLabel, formatShortDate } from '@/lib/dates'
import { formatPercent, formatSeconds } from '@/lib/format'

import { GROUP_PHRASES } from './constants'

const total = ({ created, corrected = 0, errored, pending }) =>
  created + corrected + errored + pending

/**
 * Filas del gráfico de actividad: una por día o, con `byWeek`, una por semana (desde el lunes).
 * @param {Array<{ date: string, created: number, errored: number, pending: number }>} byDay
 */
export function activityRows(byDay, { byWeek = false } = {}) {
  if (!byWeek) {
    return byDay.map(({ date, created, corrected = 0, errored, pending }) => ({
      key: date,
      date,
      label: formatDayLabel(date),
      values: { created, corrected, errored, pending },
    }))
  }
  const weeks = new Map()
  for (const { date, created, corrected = 0, errored, pending } of byDay) {
    const monday = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const values = weeks.get(monday) ?? { created: 0, corrected: 0, errored: 0, pending: 0 }
    values.created += created
    values.corrected += corrected
    values.errored += errored
    values.pending += pending
    weeks.set(monday, values)
  }
  return [...weeks].map(([monday, values]) => ({
    key: monday,
    date: monday,
    label: formatShortDate(monday),
    values,
  }))
}

/** "El martes 6 fue el peor: 9 de 31 con error." (o la semana). */
export function worstSentence(rows, { byWeek = false } = {}) {
  if (!rows.some((row) => total(row.values) > 0)) return null
  const share = (row) => row.values.errored / total(row.values)
  const worst = rows
    .filter((row) => row.values.errored > 0)
    .sort((a, b) => b.values.errored - a.values.errored || share(b) - share(a))[0]
  if (!worst)
    return byWeek
      ? 'Ninguna semana con errores en el período.'
      : 'Ningún día con errores en el período.'
  const counts = `${worst.values.errored} de ${total(worst.values)} con error`
  if (byWeek) return `La semana del ${formatShortDate(worst.date)} fue la peor: ${counts}.`
  const name = format(parseISO(worst.date), 'EEEE d', { locale: es })
  return `El ${name} fue el peor: ${counts}.`
}

/** "Las 8 causas detrás de los 46 errores del período." */
export function causesSentence(causes, errored) {
  if (causes.length === 0) return null
  const errors = errored === 1 ? 'del único error' : `de los ${errored} errores`
  const prefix = causes.length === 1 ? 'Una sola causa' : `Las ${causes.length} causas`
  return `${prefix} detrás ${errors} del período.`
}

/** "25 de los 46 errores (54 %) nacen del dato que viaja en el negocio: …" */
export function groupSentence(groups, errored) {
  const [top] = groups
  if (!top || errored < 2) return null
  const phrase = GROUP_PHRASES[top.key] ?? GROUP_PHRASES.other
  return `${top.count} de los ${errored} errores (${formatPercent(top.count, errored, 0)}) ${phrase}.`
}

const CREATED = new Set(['completed', 'destination_created', 'destination_created_origin_error'])

/**
 * Segundos que tardó la corrección de un negocio: solo si hubo errores antes de su primer
 * documento creado (si el primer intento ya lo creó, no hubo nada que corregir). Si no, null.
 */
function correctionSeconds(item) {
  const firstCreated = item.steps.findIndex((step) => CREATED.has(step.status))
  if (firstCreated <= 0 || item.resolvedAfterSeconds === null) return null
  const hadErrors = item.steps
    .slice(0, firstCreated)
    .some((step) => step.status === 'errored' || step.status === 'corrected')
  return hadErrors ? item.resolvedAfterSeconds : null
}

/** "2 h 10 hasta resolver", "creado al primer intento" o "sin documento todavía". */
export function attemptOutcome(item) {
  const firstCreated = item.steps.findIndex((step) => CREATED.has(step.status))
  if (firstCreated === -1) return 'sin documento todavía'
  if (firstCreated === 0) return 'creado al primer intento'
  const seconds = correctionSeconds(item)
  return seconds === null
    ? 'creado después de reintentar'
    : `${formatSeconds(seconds)} hasta resolver`
}

/** "12 negocios entraron más de una vez. Entre los que arrastraron errores, la corrección tardó…" */
export function multiAttemptSentence({ total: count, items }) {
  if (count === 0) return null
  const head =
    count === 1 ? 'Un negocio entró más de una vez.' : `${count} negocios entraron más de una vez.`
  const times = items.map(correctionSeconds).filter((seconds) => seconds !== null)
  if (times.length === 0) return head
  const [min, max] = [Math.min(...times), Math.max(...times)]
  if (times.length === 1 || min === max) return `${head} La corrección tardó ${formatSeconds(min)}.`
  return `${head} Entre los que arrastraron errores, la corrección tardó de ${formatSeconds(min)} a ${formatSeconds(max)}.`
}

/** "471 documentos recibidos del 13 de septiembre al 12 de octubre de 2026". */
export function periodSubtitle(documents, period) {
  const from = parseISO(period.from)
  const last = new Date(parseISO(period.to).getTime() - 1)
  const sameYear = from.getFullYear() === last.getFullYear()
  const start = format(from, sameYear ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy", { locale: es })
  const end = format(last, "d 'de' MMMM 'de' yyyy", { locale: es })
  const what = documents === 1 ? '1 documento recibido' : `${documents} documentos recibidos`
  return `${what} del ${start} al ${end}`
}
