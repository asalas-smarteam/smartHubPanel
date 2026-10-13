import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import {
  addMessage,
  changeStatus,
  findTicket,
  findTicketAttachment,
  getTickets,
  isTenantFailing,
  readAttachment,
  save,
  toStaffDetail,
  toStaffListItem,
} from '../tickets-db'
import {
  byLastActivityDesc,
  CATEGORIES,
  paginate,
  readFormData,
  readImages,
  readPagination,
  requireText,
  STATUSES,
} from './ticket-utils'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

const PAGE_WINDOW_LIMIT = 1000

const emptyCounts = () => Object.fromEntries(STATUSES.map((status) => [status, 0]))

/** Ticket del tenant de la ruta, validando que el tenant exista (spec: si no, 404). */
function loadTicket(params) {
  const tenantExists = getDb().tenants.some((tenant) => tenant.tenantKey === params.tenantKey)
  return tenantExists ? findTicket(params.tenantKey, params.id) : null
}

async function staffContext(request, params, { mutation = true } = {}) {
  await maybeDelay()
  if (mutation) {
    const headerError = checkPanelHeader(request)
    if (headerError) return { response: headerError }
  }
  const { user, response } = authorize({ permission: 'staff.tickets' })
  if (response) return { response }
  const ticket = loadTicket(params)
  if (!ticket) return { response: errorResponse(404, 'not_found') }
  return { user, ticket }
}

export const staffTicketHandlers = [
  http.get('/api/staff/tickets', async ({ request }) => {
    await maybeDelay()
    const { response } = authorize({ permission: 'staff.tickets' })
    if (response) return response

    const params = new URL(request.url).searchParams
    const pagination = readPagination(params)
    if (!pagination) return errorResponse(400, 'validation_error', 'Paginación inválida.')
    if (pagination.page * pagination.pageSize > PAGE_WINDOW_LIMIT) {
      return errorResponse(400, 'page_window_exceeded')
    }

    const status = params.get('status')
    const tenantKey = params.get('tenantKey')
    const category = params.get('category')
    if (status && !STATUSES.includes(status))
      return errorResponse(400, 'validation_error', 'Estado inválido.')
    if (category && !CATEGORIES.includes(category)) {
      return errorResponse(400, 'validation_error', 'Categoría inválida.')
    }

    // Como el backend: consulta cada tenant; si uno falla, devuelve los demás con un aviso.
    const tenants = getDb().tenants.filter((tenant) => !tenantKey || tenant.tenantKey === tenantKey)
    const warnings = []
    const list = []
    for (const tenant of tenants) {
      if (isTenantFailing(tenant.tenantKey)) {
        warnings.push({
          tenantKey: tenant.tenantKey,
          error: 'No se pudo consultar la base del tenant',
        })
        continue
      }
      list.push(
        ...getTickets().filter(
          (ticket) =>
            ticket.tenantKey === tenant.tenantKey &&
            (!status || ticket.status === status) &&
            (!category || ticket.category === category),
        ),
      )
    }
    list.sort(byLastActivityDesc)
    return HttpResponse.json({ ...paginate(list.map(toStaffListItem), pagination), warnings })
  }),

  http.get('/api/staff/tickets/summary', async () => {
    await maybeDelay()
    const { response } = authorize({ permission: 'staff.tickets' })
    if (response) return response

    const byStatus = emptyCounts()
    const byTenant = getDb()
      .tenants.filter((tenant) => !isTenantFailing(tenant.tenantKey))
      .map((tenant) => {
        const counts = emptyCounts()
        for (const ticket of getTickets()) {
          if (ticket.tenantKey !== tenant.tenantKey) continue
          counts[ticket.status] += 1
          byStatus[ticket.status] += 1
        }
        return { tenantKey: tenant.tenantKey, companyName: tenant.companyName, byStatus: counts }
      })
    return HttpResponse.json({ byStatus, byTenant })
  }),

  http.get('/api/staff/tenants/:tenantKey/tickets/:id', async ({ request, params }) => {
    const { ticket, response } = await staffContext(request, params, { mutation: false })
    if (response) return response
    ticket.staffLastSeenAt = new Date().toISOString()
    save()
    return HttpResponse.json(toStaffDetail(ticket))
  }),

  http.post('/api/staff/tenants/:tenantKey/tickets/:id/messages', async ({ request, params }) => {
    const { user, ticket, response } = await staffContext(request, params)
    if (response) return response
    if (ticket.status === 'resuelto') return errorResponse(409, 'invalid_transition')

    const form = await readFormData(request)
    if (!form) return errorResponse(400, 'validation_error', 'Formulario inválido.')
    const body = requireText(form.get('body'), { label: 'El mensaje', max: 5000 })
    if (body.response) return body.response
    const images = await readImages(form)
    if (images.response) return images.response

    addMessage(ticket, {
      authorType: 'smarteam',
      user,
      body: body.text,
      attachments: images.attachments,
    })
    // Primer mensaje de Smarteam: abierto → en progreso (y queda firstResponseAt).
    if (ticket.status === 'abierto')
      changeStatus(ticket, 'en_progreso', { byType: 'smarteam', user })
    save()
    return HttpResponse.json(toStaffDetail(ticket), { status: 201 })
  }),

  http.post('/api/staff/tenants/:tenantKey/tickets/:id/status', async ({ request, params }) => {
    const { user, ticket, response } = await staffContext(request, params)
    if (response) return response
    const { to } = await readJson(request)
    const allowed =
      (ticket.status === 'en_progreso' && to === 'esperando_cliente') ||
      (ticket.status === 'resuelto' && to === 'en_progreso')
    if (!allowed) return errorResponse(409, 'invalid_transition')
    changeStatus(ticket, to, { byType: 'smarteam', user })
    save()
    return HttpResponse.json(toStaffDetail(ticket))
  }),

  http.post('/api/staff/tenants/:tenantKey/tickets/:id/resolve', async ({ request, params }) => {
    const { user, ticket, response } = await staffContext(request, params)
    if (response) return response
    if (ticket.status === 'resuelto') return errorResponse(409, 'invalid_transition')

    const form = await readFormData(request)
    if (!form) return errorResponse(400, 'validation_error', 'Formulario inválido.')
    const message = requireText(form.get('message'), { label: 'El mensaje al cliente', max: 5000 })
    if (message.response) return message.response
    const internal = requireText(form.get('internalResolution'), {
      label: 'La resolución interna',
      max: 5000,
    })
    if (internal.response) return internal.response
    const images = await readImages(form)
    if (images.response) return images.response

    addMessage(ticket, {
      authorType: 'smarteam',
      user,
      body: message.text,
      attachments: images.attachments,
    })
    const now = new Date().toISOString()
    ticket.internalResolution = {
      text: internal.text,
      updatedAt: now,
      updatedBy: { userId: user.id, name: user.name },
    }
    changeStatus(ticket, 'resuelto', { byType: 'smarteam', user })
    ticket.resolvedAt = now
    save()
    return HttpResponse.json(toStaffDetail(ticket))
  }),

  http.put(
    '/api/staff/tenants/:tenantKey/tickets/:id/internal-resolution',
    async ({ request, params }) => {
      const { user, ticket, response } = await staffContext(request, params)
      if (response) return response
      const text = requireText((await readJson(request)).text, {
        label: 'La resolución interna',
        max: 5000,
      })
      if (text.response) return text.response
      ticket.internalResolution = {
        text: text.text,
        updatedAt: new Date().toISOString(),
        updatedBy: { userId: user.id, name: user.name },
      }
      save()
      return HttpResponse.json(toStaffDetail(ticket))
    },
  ),

  http.get(
    '/api/staff/tenants/:tenantKey/tickets/:id/attachments/:fileId',
    async ({ request, params }) => {
      const { ticket, response } = await staffContext(request, params, { mutation: false })
      if (response) return response
      const attachment = findTicketAttachment(ticket, params.fileId)
      const file = attachment && readAttachment(attachment.fileId, attachment.contentType)
      if (!file) return errorResponse(404, 'not_found')
      return new HttpResponse(file.body, {
        headers: {
          'Content-Type': file.contentType,
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private',
        },
      })
    },
  ),
]
