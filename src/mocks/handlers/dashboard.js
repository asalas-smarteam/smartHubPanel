import { http, HttpResponse } from 'msw'

import { CAUSE_GROUPS, classifyError } from '../error-causes'
import { INTERNAL } from '../seed-events'
import { tenantEvents, toApiEvent } from '../operations'
import { eachLocalDay, localDate, readPeriod } from '../period'
import { bothScopes, resolveScope } from './scope'
import { errorResponse, maybeDelay } from './utils'

// Resumen de integración del Inicio (contrato F1 a F6), calculado desde los eventos del seed.

const CREATED = new Set(['completed', 'destination_created', 'destination_created_origin_error'])
const PENDING = new Set(['waiting', 'in_process'])
const MAX_MULTI_ATTEMPT = 10

const groupOf = (status) => {
  if (CREATED.has(status)) return 'created'
  if (PENDING.has(status)) return 'pending'
  return 'errored'
}
const seconds = (doc) => (Date.parse(doc.updatedAt) - Date.parse(doc.createdAt)) / 1000
const average = (values) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
// Más frecuentes primero; en el empate, "otro" al final y luego por nombre.
const byCountDesc = (key) => (a, b) =>
  b.count - a.count || (a.key === 'other') - (b.key === 'other') || key(a).localeCompare(key(b))

function summarizeCauses(errored) {
  const causes = new Map()
  for (const doc of errored) {
    const cause = classifyError(doc.lastError)
    const entry = causes.get(cause.key) ?? { ...cause, count: 0 }
    entry.count += 1
    causes.set(cause.key, entry)
  }
  const groups = new Map()
  for (const cause of causes.values())
    groups.set(cause.group, (groups.get(cause.group) ?? 0) + cause.count)
  return {
    causes: [...causes.values()].sort(byCountDesc((cause) => cause.label)),
    groups: [...groups]
      .map(([key, count]) => ({ key, count }))
      .sort(
        (a, b) => b.count - a.count || CAUSE_GROUPS.indexOf(a.key) - CAUSE_GROUPS.indexOf(b.key),
      ),
  }
}

function step({ api, raw }) {
  let summary = 'En proceso'
  if (api.status === 'errored') summary = classifyError(api.lastError).label
  else if (CREATED.has(api.status)) summary = 'Documento creado'
  return {
    at: api.createdAt,
    status: api.status,
    summary,
    documentNumber: CREATED.has(api.status)
      ? (raw[INTERNAL.AUDIT_FIELD]?.destinationDocument ?? null)
      : null,
  }
}

function summarizeAttempts(docs) {
  const byReference = new Map()
  for (const doc of docs) {
    if (!doc.api.reference) continue
    byReference.set(doc.api.reference, [...(byReference.get(doc.api.reference) ?? []), doc])
  }
  const repeated = [...byReference.values()]
    .filter((attempts) => attempts.length > 1)
    .map((attempts) => attempts.sort((a, b) => a.api.createdAt.localeCompare(b.api.createdAt)))
    .sort(
      (a, b) => b.length - a.length || b.at(-1).api.createdAt.localeCompare(a.at(-1).api.createdAt),
    )

  return {
    total: repeated.length,
    items: repeated.slice(0, MAX_MULTI_ATTEMPT).map((attempts) => {
      const created = attempts.find((doc) => CREATED.has(doc.api.status))
      return {
        reference: attempts[0].api.reference,
        title: attempts[0].raw.payload?.deal?.dealname ?? null,
        attempts: attempts.length,
        resolvedAfterSeconds: created
          ? Math.round(
              (Date.parse(created.api.updatedAt) - Date.parse(attempts[0].api.createdAt)) / 1000,
            )
          : null,
        steps: attempts.map(step),
      }
    }),
  }
}

/** Cuerpo de F2 para los eventos (crudos) de una empresa en el período. */
export function integrationSummary(rawEvents, { from, to, tz }) {
  const docs = rawEvents
    .map((raw) => ({ raw, api: toApiEvent(raw) }))
    .filter(({ api }) => {
      const ms = Date.parse(api.createdAt)
      return ms >= from && ms < to
    })
  const list = (group) =>
    docs.filter((doc) => groupOf(doc.api.status) === group).map((doc) => doc.api)
  const created = list('created')
  const errored = list('errored')
  const pending = list('pending')

  const references = new Set(docs.map((doc) => doc.api.reference).filter(Boolean))
  const withDocument = new Set(created.map((doc) => doc.reference))

  const days = new Map(
    eachLocalDay(from, to, tz).map((date) => [date, { date, created: 0, errored: 0, pending: 0 }]),
  )
  for (const { api } of docs)
    days.get(localDate(Date.parse(api.createdAt), tz))[groupOf(api.status)] += 1

  return {
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), tz },
    totals: {
      documents: docs.length,
      created: created.length,
      errored: errored.length,
      pending: pending.length,
      references: references.size,
      referencesWithoutDocument: [...references].filter((ref) => !withDocument.has(ref)).length,
      avgDurationSeconds: average([...created, ...errored].map(seconds)),
      avgDurationCreatedSeconds: average(created.map(seconds)),
      oldestPendingAt: pending.map((doc) => doc.createdAt).sort()[0] ?? null,
    },
    byDay: [...days.values()],
    ...summarizeCauses(errored),
    multiAttempt: summarizeAttempts(docs),
  }
}

export const dashboardHandlers = [
  ...bothScopes(http, '/dashboard/integration', async ({ request, params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'events.read', params })
    if (scope.response) return scope.response
    const period = readPeriod(new URL(request.url).searchParams)
    if (!period) return errorResponse(400, 'validation_error', 'Período o zona horaria inválidos.')
    return HttpResponse.json(integrationSummary(tenantEvents(scope.tenantKey), period))
  }),
]
