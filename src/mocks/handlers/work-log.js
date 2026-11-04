import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import {
  addMessage,
  addWorkLogEntry,
  changeStatus,
  companyNameOf,
  getTickets,
  resolveTicket,
  save,
  toWorkLogEntry,
} from '../tickets-db'
import { authorizeBearer } from './api-tokens'
import { requireText } from './ticket-utils'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

// Registro de trabajo de los tickets (plan 4z): lo usa la skill de registro de tiempo con un
// token personal (`Authorization: Bearer spn_…`), o el panel con la sesión de Smarteam.

const TEXT_MAX = 5000
const MIN_HOURS = 0.25
const MAX_HOURS = 24
const CRM_PROJECT_MAX = 64

/**
 * Token personal o, si no viene `Authorization`, sesión de Smarteam (con la defensa CSRF en las
 * mutaciones). Devuelve `{ user, scope }` o `{ response }`. `scope` separa la idempotencia por
 * token (o por sesión).
 */
function authorizeWorkLog(request, { mutation }) {
  const bearer = authorizeBearer(request)
  if (!bearer.none) return bearer
  if (mutation) {
    const headerError = checkPanelHeader(request)
    if (headerError) return { response: headerError }
  }
  const { user, response } = authorize({ permission: 'staff.tickets' })
  if (response) return { response }
  return { user, scope: `session:${user.id}` }
}

const findByCode = (code) => {
  const wanted = String(code).trim().toUpperCase()
  return getTickets().find((ticket) => ticket.code.toUpperCase() === wanted) ?? null
}

const invalid = (message) => ({ response: errorResponse(400, 'validation_error', message) })

const PROJECT_PATTERN = /^[A-Za-z0-9_-]+$/
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

/** Texto opcional: recortado; vacío o ausente → null. Devuelve `{ value }` o `{ response }`. */
function optionalText(raw, { label, max }) {
  if (raw === undefined || raw === null) return { value: null }
  if (typeof raw !== 'string') return invalid(`${label} debe ser texto.`)
  const value = raw.trim()
  if (value.length > max) return invalid(`${label} supera los ${max} caracteres.`)
  return { value: value || null }
}

/** Valida el cuerpo del POST. Devuelve los valores limpios o `{ response }`. */
function readWorkLog(body) {
  const summary = requireText(body.summary, { label: 'El resumen', max: TEXT_MAX })
  if (summary.response) return summary

  if (body.resolve !== undefined && typeof body.resolve !== 'boolean') {
    return invalid('"resolve" debe ser verdadero o falso.')
  }
  const resolve = body.resolve === true

  const note = optionalText(body.internalNote, { label: 'La nota interna', max: TEXT_MAX })
  if (note.response) return note
  // Al resolver, la nota es la resolución interna: obligatoria, como en el botón Resolver.
  if (resolve && !note.value) {
    return invalid('La nota interna (internalNote) es obligatoria al resolver.')
  }

  // Número JSON: "2.5" (texto) no vale.
  const { hours } = body
  const validHours =
    typeof hours === 'number' &&
    Number.isFinite(hours) &&
    hours >= MIN_HOURS &&
    hours <= MAX_HOURS &&
    Number.isInteger(hours * 4)
  if (!validHours) return invalid('Las horas (hours) van de 0,25 a 24, en cuartos de hora.')

  const project = optionalText(body.crmProjectId, {
    label: 'El proyecto del CRM (crmProjectId)',
    max: CRM_PROJECT_MAX,
  })
  if (project.response) return project
  if (project.value && !PROJECT_PATTERN.test(project.value)) {
    return invalid('El proyecto del CRM (crmProjectId) solo admite letras, números, "_" y "-".')
  }

  return {
    summary: summary.text,
    internalNote: note.value,
    hours,
    resolve,
    crmProjectId: project.value,
  }
}

/** Huella de los valores normalizados para la idempotencia: JSON con las llaves ordenadas. */
function fingerprint(value) {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${fingerprint(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

export const workLogHandlers = [
  http.get('/api/staff/tickets/by-code/:code', async ({ request, params }) => {
    await maybeDelay()
    const { response } = authorizeWorkLog(request, { mutation: false })
    if (response) return response
    const ticket = findByCode(params.code)
    if (!ticket) return errorResponse(404, 'not_found')
    return HttpResponse.json({
      tenantKey: ticket.tenantKey,
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      companyName: companyNameOf(ticket.tenantKey),
      status: ticket.status,
      openedAt: ticket.openedAt,
    })
  }),

  http.post('/api/staff/tickets/by-code/:code/work-log', async ({ request, params }) => {
    await maybeDelay()
    const { user, scope, response } = authorizeWorkLog(request, { mutation: true })
    if (response) return response

    const key = request.headers.get('Idempotency-Key')
    if (key !== null && !IDEMPOTENCY_KEY_PATTERN.test(key)) {
      return errorResponse(
        400,
        'validation_error',
        'Idempotency-Key admite de 1 a 128 caracteres: letras, números, ".", "_", ":" y "-".',
      )
    }

    const ticket = findByCode(params.code)
    if (!ticket) return errorResponse(404, 'not_found')

    const values = readWorkLog(await readJson(request))
    if (values.response) return values.response

    // Misma Idempotency-Key con el mismo token: la misma respuesta, sin publicar de nuevo. La
    // huella se toma de los campos ya normalizados (un cambio de espacios es el mismo cuerpo); con
    // otro contenido, 422. Va antes del 409 para que repetir un "resolver" devuelva lo mismo.
    const print = fingerprint({ ticketId: ticket.id, ...values })
    const stored = key ? getDb().workLogIdempotency[`${scope}:${key}`] : null
    if (stored) {
      if (stored.fingerprint !== print) {
        return errorResponse(
          422,
          'idempotency_key_reused',
          'Esa Idempotency-Key ya se usó con otro contenido.',
        )
      }
      return HttpResponse.json(stored.body, { status: stored.status })
    }

    // Sobre un ticket resuelto no se publica (como en las respuestas de Smarteam) ni se vuelve
    // a resolver: 409 sin tocar nada.
    if (ticket.status === 'resuelto') {
      return errorResponse(409, 'invalid_transition', 'El ticket ya está resuelto.')
    }

    let messageId
    if (values.resolve) {
      // La nota reemplaza la resolución interna que hubiera, como el botón Resolver.
      messageId = resolveTicket(ticket, {
        user,
        message: values.summary,
        internalResolution: values.internalNote,
      })
    } else {
      messageId = addMessage(ticket, {
        authorType: 'smarteam',
        user,
        body: values.summary,
        attachments: [],
      })
      if (ticket.status === 'abierto') {
        changeStatus(ticket, 'en_progreso', { byType: 'smarteam', user })
      }
    }
    const entry = addWorkLogEntry(ticket, {
      user,
      hours: values.hours,
      internalNote: values.internalNote,
      crmProjectId: values.crmProjectId,
      messageId,
    })

    const body = { entry: toWorkLogEntry(entry), ticket: { status: ticket.status } }
    if (key) {
      getDb().workLogIdempotency[`${scope}:${key}`] = { status: 201, body, fingerprint: print }
    }
    save()
    return HttpResponse.json(body, { status: 201 })
  }),
]
