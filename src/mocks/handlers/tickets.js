import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import { findContextRecord } from '../operations'
import {
  addMessage,
  changeStatus,
  findTicket,
  findTicketAttachment,
  getTickets,
  nextTicketNumber,
  readAttachment,
  save,
  toClientDetail,
  toClientListItem,
} from '../tickets-db'
import {
  byLastActivityDesc,
  CATEGORIES,
  paginate,
  readFormData,
  readImages,
  readPagination,
  requireText,
} from './ticket-utils'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

const CONTEXT_TYPES = ['webhookEvent', 'syncLog']

// API del cliente: el tenant sale SIEMPRE de la sesión (nunca de un parámetro).
export const ticketHandlers = [
  http.get('/api/tickets', async ({ request }) => {
    await maybeDelay()
    const { user, response } = authorize({ permission: 'tickets.read' })
    if (response) return response

    const params = new URL(request.url).searchParams
    const pagination = readPagination(params)
    if (!pagination) return errorResponse(400, 'validation_error', 'Paginación inválida.')

    const status = params.get('status')
    const category = params.get('category')
    const list = getTickets()
      .filter((ticket) => ticket.tenantKey === user.tenantKey)
      .filter((ticket) => !status || ticket.status === status)
      .filter((ticket) => !category || ticket.category === category)
      .sort(byLastActivityDesc)
      .map(toClientListItem)
    return HttpResponse.json(paginate(list, pagination))
  }),

  http.post('/api/tickets', async ({ request }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ permission: 'tickets.create' })
    if (response) return response

    const form = await readFormData(request)
    if (!form) return errorResponse(400, 'validation_error', 'Formulario inválido.')

    const title = requireText(form.get('title'), { label: 'El título', max: 150 })
    if (title.response) return title.response
    const description = requireText(form.get('description'), { label: 'La descripción', max: 5000 })
    if (description.response) return description.response
    const category = form.get('category')
    if (!CATEGORIES.includes(category))
      return errorResponse(400, 'validation_error', 'Elige una categoría.')

    let context = null
    const contextType = form.get('contextType')
    const contextId = form.get('contextId')
    if (contextType || contextId) {
      if (!CONTEXT_TYPES.includes(contextType) || !contextId) {
        return errorResponse(400, 'validation_error', 'Contexto inválido.')
      }
      // Solo registros de la empresa de la sesión; si no, 404 (no se confirma que existan).
      const record = findContextRecord(user.tenantKey, contextType, contextId)
      if (!record) return errorResponse(404, 'not_found')
      context = { type: record.type, refId: record.id, snapshot: structuredClone(record.snapshot) }
    }

    const images = await readImages(form)
    if (images.response) return images.response

    const number = nextTicketNumber(user.tenantKey)
    const now = new Date().toISOString()
    const ticket = {
      id: `t-${user.tenantKey.toLowerCase()}-${String(number).padStart(3, '0')}-${Date.now().toString(36)}`,
      tenantKey: user.tenantKey,
      number,
      code: `${user.tenantKey}-${String(number).padStart(4, '0')}`,
      title: title.text,
      description: description.text,
      category,
      status: 'abierto',
      context,
      createdBy: { userId: user.id, name: user.name, role: user.role },
      attachments: images.attachments,
      messages: [],
      internalResolution: null,
      statusHistory: [{ from: null, to: 'abierto', byType: 'cliente', byName: user.name, at: now }],
      openedAt: now,
      firstResponseAt: null,
      resolvedAt: null,
      reopenCount: 0,
      lastActivityAt: now,
      lastPublicAuthorType: 'cliente',
      clientLastSeenAt: now,
      staffLastSeenAt: null,
    }
    getDb().tickets.push(ticket)
    save()
    return HttpResponse.json(toClientDetail(ticket), { status: 201 })
  }),

  http.get('/api/tickets/:id', async ({ params }) => {
    await maybeDelay()
    const { user, response } = authorize({ permission: 'tickets.read' })
    if (response) return response
    const ticket = findTicket(user.tenantKey, params.id)
    if (!ticket) return errorResponse(404, 'not_found')
    ticket.clientLastSeenAt = new Date().toISOString()
    save()
    return HttpResponse.json(toClientDetail(ticket))
  }),

  http.post('/api/tickets/:id/messages', async ({ request, params }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ permission: 'tickets.reply' })
    if (response) return response
    const ticket = findTicket(user.tenantKey, params.id)
    if (!ticket) return errorResponse(404, 'not_found')
    // Un ticket resuelto se reabre con "Sigue fallando", no con un mensaje.
    if (ticket.status === 'resuelto') return errorResponse(409, 'invalid_transition')

    const form = await readFormData(request)
    if (!form) return errorResponse(400, 'validation_error', 'Formulario inválido.')
    const body = requireText(form.get('body'), { label: 'El mensaje', max: 5000 })
    if (body.response) return body.response
    const images = await readImages(form)
    if (images.response) return images.response

    addMessage(ticket, {
      authorType: 'cliente',
      user,
      body: body.text,
      attachments: images.attachments,
    })
    if (ticket.status === 'esperando_cliente') {
      changeStatus(ticket, 'en_progreso', { byType: 'cliente', user })
    }
    save()
    return HttpResponse.json(toClientDetail(ticket), { status: 201 })
  }),

  http.post('/api/tickets/:id/reopen', async ({ request, params }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ permission: 'tickets.reopen' })
    if (response) return response
    const ticket = findTicket(user.tenantKey, params.id)
    if (!ticket) return errorResponse(404, 'not_found')
    if (ticket.status !== 'resuelto') return errorResponse(409, 'invalid_transition')

    const message = requireText((await readJson(request)).message, {
      label: 'El mensaje',
      max: 5000,
    })
    if (message.response) return message.response

    addMessage(ticket, { authorType: 'cliente', user, body: message.text, attachments: [] })
    changeStatus(ticket, 'abierto', { byType: 'cliente', user })
    ticket.reopenCount += 1
    save()
    return HttpResponse.json(toClientDetail(ticket))
  }),

  http.get('/api/tickets/:id/attachments/:fileId', async ({ params }) => {
    const { user, response } = authorize({ permission: 'tickets.read' })
    if (response) return response
    const ticket = findTicket(user.tenantKey, params.id)
    const attachment = ticket && findTicketAttachment(ticket, params.fileId)
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
  }),
]
