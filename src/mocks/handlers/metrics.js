import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import { addDays, localDate, median, mondayOf, readPeriod } from '../period'
import { companyNameOf, getTickets } from '../tickets-db'
import { CATEGORIES } from './ticket-utils'
import { authorize, errorResponse, maybeDelay } from './utils'

// Métricas de soporte (contrato F7 a F9), calculadas desde los tickets del mock.
// Ojo: estas rutas van antes que `/tickets/:id` en handlers/index.js.

const HOUR = 3600
const BUCKETS = [
  ['lt4h', 4 * HOUR],
  ['4h_24h', 24 * HOUR],
  ['1d_3d', 72 * HOUR],
  ['gt3d', Infinity],
]

const ms = (iso) => Date.parse(iso)
const resolutionSeconds = (ticket) => (ms(ticket.resolvedAt) - ms(ticket.openedAt)) / 1000
const firstResponseSeconds = (ticket) => (ms(ticket.firstResponseAt) - ms(ticket.openedAt)) / 1000
const isOpen = (ticket) => ticket.status !== 'resuelto'

/** Resueltos hoy cuya última resolución cae en `[from, to)` (F9). */
const resolvedBetween = (tickets, from, to) =>
  tickets.filter(
    (ticket) =>
      ticket.status === 'resuelto' && ms(ticket.resolvedAt) >= from && ms(ticket.resolvedAt) < to,
  )

function tenantRow(tenantKey, tickets, { from, to }) {
  const resolved = resolvedBetween(tickets, from, to)
  const responded = tickets.filter(
    (t) => t.firstResponseAt && ms(t.openedAt) >= from && ms(t.openedAt) < to,
  )
  return {
    tenantKey,
    companyName: companyNameOf(tenantKey),
    resolved: resolved.length,
    medianFirstResponseSeconds: median(responded.map(firstResponseSeconds)),
    medianResolutionSeconds: median(resolved.map(resolutionSeconds)),
    reopened: resolved.filter((t) => t.reopenCount > 0).length,
    open: tickets.filter(isOpen).length,
  }
}

/** Cuerpo de F8. `tenantKeys`: empresas de la tabla por empresa (solo Smarteam). */
export function ticketMetrics(tickets, { from, to, tz }, { tenantKeys } = {}) {
  const row = tenantRow(null, tickets, { from, to })
  const resolved = resolvedBetween(tickets, from, to)
  const open = tickets.filter(isOpen)

  const weeks = new Map()
  for (
    let week = mondayOf(localDate(from, tz));
    week <= localDate(to - 1, tz);
    week = addDays(week, 7)
  ) {
    weeks.set(week, [])
  }
  for (const ticket of resolved)
    weeks.get(mondayOf(localDate(ms(ticket.resolvedAt), tz))).push(ticket)

  const categories = new Map()
  for (const ticket of resolved)
    categories.set(ticket.category, [...(categories.get(ticket.category) ?? []), ticket])

  const body = {
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), tz },
    totals: {
      resolved: row.resolved,
      resolvedPreviousPeriod: resolvedBetween(tickets, from - (to - from), from).length,
      reopened: row.reopened,
      open: open.length,
      openWithoutFirstResponse: open.filter((t) => !t.firstResponseAt).length,
      medianFirstResponseSeconds: row.medianFirstResponseSeconds,
      medianResolutionSeconds: row.medianResolutionSeconds,
    },
    byWeek: [...weeks].map(([weekStart, list]) => ({
      weekStart,
      resolved: list.length,
      reopened: list.filter((t) => t.reopenCount > 0).length,
      medianResolutionSeconds: median(list.map(resolutionSeconds)),
    })),
    buckets: BUCKETS.map(([key, limit], index) => {
      const lower = index === 0 ? 0 : BUCKETS[index - 1][1]
      const count = resolved.filter((t) => {
        const seconds = resolutionSeconds(t)
        return seconds >= lower && seconds < limit
      }).length
      return { key, count }
    }),
    byCategory: [...categories]
      .map(([category, list]) => ({
        category,
        resolved: list.length,
        medianResolutionSeconds: median(list.map(resolutionSeconds)),
      }))
      .sort((a, b) => b.resolved - a.resolved || a.category.localeCompare(b.category)),
  }
  if (tenantKeys) {
    body.byTenant = tenantKeys
      .map((tenantKey) =>
        tenantRow(
          tenantKey,
          tickets.filter((t) => t.tenantKey === tenantKey),
          { from, to },
        ),
      )
      .sort((a, b) => b.resolved - a.resolved || a.companyName.localeCompare(b.companyName))
  }
  return body
}

const invalidPeriod = () =>
  errorResponse(400, 'validation_error', 'Período o zona horaria inválidos.')

export const metricsHandlers = [
  // Cliente: su empresa, sin tabla por empresa.
  http.get('/api/tickets/metrics', async ({ request }) => {
    await maybeDelay()
    const { user, response } = authorize({ permission: 'tickets.read' })
    if (response) return response
    if (!user.tenantKey) return errorResponse(403, 'forbidden')
    const period = readPeriod(new URL(request.url).searchParams)
    if (!period) return invalidPeriod()
    const tickets = getTickets().filter((t) => t.tenantKey === user.tenantKey)
    return HttpResponse.json(ticketMetrics(tickets, period))
  }),

  // Smarteam: todas las empresas o una, opcionalmente una categoría.
  http.get('/api/staff/tickets/metrics', async ({ request }) => {
    await maybeDelay()
    const { response } = authorize({ permission: 'staff.tickets' })
    if (response) return response
    const params = new URL(request.url).searchParams
    const period = readPeriod(params)
    if (!period) return invalidPeriod()
    const category = params.get('category')
    if (category && !CATEGORIES.includes(category)) {
      return errorResponse(400, 'validation_error', 'Categoría inválida.')
    }
    const tenantKey = params.get('tenantKey')
    const tenants = getDb().tenants.map((tenant) => tenant.tenantKey)
    if (tenantKey && !tenants.includes(tenantKey)) return errorResponse(404, 'not_found')

    const tenantKeys = tenantKey ? [tenantKey] : tenants
    const tickets = getTickets().filter(
      (t) => tenantKeys.includes(t.tenantKey) && (!category || t.category === category),
    )
    return HttpResponse.json(ticketMetrics(tickets, period, { tenantKeys }))
  }),
]
