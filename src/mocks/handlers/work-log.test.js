import { describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { SEED_API_TOKEN } from '../api-tokens'
import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'

const STAFF_NAME = 'Equipo Smarteam'
const ticketOf = (status) =>
  getDb().tickets.find((ticket) => ticket.tenantKey === 'ACME' && ticket.status === status)
const fresh = (ticket) => getDb().tickets.find((one) => one.id === ticket.id)

/** Llamada "de afuera" (como la skill): sin cookie de sesión del panel, con Bearer opcional. */
async function call(path, { method = 'GET', token = SEED_API_TOKEN, json, headers = {} } = {}) {
  const response = await fetch(new URL(`/api${path}`, window.location.origin), {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : undefined,
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

const post = (code, json, options) =>
  call(`/staff/tickets/by-code/${code}/work-log`, { method: 'POST', json, ...options })

const VALID = { summary: 'Corregimos la vigencia de los precios.', internalNote: '', hours: 1.5 }

describe('mocks: registro de trabajo por código de ticket (plan 4z)', () => {
  it('by-code devuelve el resumen del ticket; 404 si el código no existe', async () => {
    const ticket = ticketOf('en_progreso')
    const { status, body } = await call(`/staff/tickets/by-code/${ticket.code}`)
    expect(status).toBe(200)
    expect(body).toEqual({
      tenantKey: 'ACME',
      id: ticket.id,
      code: ticket.code,
      title: ticket.title,
      companyName: 'Acme Industrial',
      status: 'en_progreso',
      openedAt: ticket.openedAt,
    })
    expect((await call('/staff/tickets/by-code/ACME-9999')).status).toBe(404)
  })

  it('sin token ni sesión 401; token inválido, revocado o vencido → 401 invalid_token', async () => {
    const code = ticketOf('en_progreso').code
    expect((await call(`/staff/tickets/by-code/${code}`, { token: null })).status).toBe(401)

    // Formato inválido: 401 sin buscarlo. Bien formado pero inexistente: también 401.
    for (const token of ['spn_no-existe', `spn_${'a'.repeat(42)}`, `spn_${'a'.repeat(42)}=`]) {
      const bad = await post(code, VALID, { token })
      expect(bad).toMatchObject({ status: 401, body: { error: 'invalid_token' } })
    }
    expect((await post(code, VALID, { token: `spn_${'a'.repeat(43)}` })).status).toBe(401)

    getDb().apiTokens[0].revokedAt = new Date().toISOString()
    expect((await post(code, VALID)).body).toMatchObject({ error: 'invalid_token' })

    getDb().apiTokens[0].revokedAt = null
    getDb().apiTokens[0].expiresAt = new Date(Date.now() - 1000).toISOString()
    expect((await call(`/staff/tickets/by-code/${code}`)).status).toBe(401)
  })

  it('401 lleva WWW-Authenticate; el esquema "Bearer" no distingue mayúsculas', async () => {
    const code = ticketOf('en_progreso').code
    const response = await fetch(
      new URL(`/api/staff/tickets/by-code/${code}`, window.location.origin),
      { headers: { Authorization: 'Bearer spn_mal' } },
    )
    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer error="invalid_token"')

    for (const scheme of ['bearer', 'BEARER', 'BeArEr']) {
      const ok = await fetch(
        new URL(`/api/staff/tickets/by-code/${code}`, window.location.origin),
        {
          headers: { Authorization: `${scheme} ${SEED_API_TOKEN}` },
        },
      )
      expect(ok.status).toBe(200)
    }
  })

  it('dueño sin staff.tickets, inactivo o inexistente → 401; con cambio de clave pendiente → 403', async () => {
    const code = ticketOf('en_progreso').code
    const owner = getDb().users.find((user) => user.id === 'u-staff-1')
    const by = () => call(`/staff/tickets/by-code/${code}`)

    owner.permissions = ['staff.users']
    expect(await by()).toMatchObject({ status: 401, body: { error: 'invalid_token' } })
    delete owner.permissions

    owner.active = false
    expect((await by()).status).toBe(401)
    owner.active = true

    owner.mustChangePassword = true
    expect(await by()).toMatchObject({ status: 403, body: { error: 'password_change_required' } })
    owner.mustChangePassword = false

    getDb().apiTokens[0].userId = 'u-no-existe'
    expect((await by()).status).toBe(401)
  })

  it('el token no sirve en otros endpoints', async () => {
    expect((await call('/staff/tickets')).status).toBe(401)
    expect((await call('/account/api-tokens')).status).toBe(401)
  })

  it('publica el resumen como mensaje público a nombre del dueño y guarda la entrada', async () => {
    const ticket = ticketOf('esperando_cliente')
    const messagesBefore = ticket.messages.length
    const before = Date.now()
    const { status, body } = await post(ticket.code, {
      ...VALID,
      internalNote: 'Faltaba la vigencia en el ERP.',
      crmProjectId: ' 123456 ',
    })
    expect(status).toBe(201)
    expect(body.entry).toMatchObject({
      author: { name: STAFF_NAME },
      hours: 1.5,
      internalNote: 'Faltaba la vigencia en el ERP.',
      crmProjectId: '123456',
    })
    expect(body.ticket).toEqual({ status: 'esperando_cliente' })

    const saved = fresh(ticket)
    expect(saved.messages).toHaveLength(messagesBefore + 1)
    const message = saved.messages.at(-1)
    expect(message).toMatchObject({
      id: body.entry.messageId,
      authorType: 'smarteam',
      authorName: STAFF_NAME,
      body: VALID.summary,
    })
    // Último uso del token actualizado.
    expect(Date.parse(getDb().apiTokens[0].lastUsedAt)).toBeGreaterThanOrEqual(before - 1000)

    // El detalle de Smarteam lo trae; el del cliente nunca.
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const staff = await apiFetch(`/staff/tenants/ACME/tickets/${ticket.id}`)
    expect(staff.workLog.totalHours).toBe(1.5)
    expect(staff.workLog.entries[0]).toEqual(body.entry)
    signInAs(DEMO_ACCOUNTS.clienteUsuario.email)
    const client = await apiFetch(`/tickets/${ticket.id}`)
    expect(client).not.toHaveProperty('workLog')
    expect(JSON.stringify(client)).not.toContain('Faltaba la vigencia')
  })

  it('en un ticket "Abierto" lo pasa a "En progreso"', async () => {
    const ticket = ticketOf('abierto')
    const { body } = await post(ticket.code, VALID)
    expect(body.ticket.status).toBe('en_progreso')
    expect(fresh(ticket).firstResponseAt).not.toBeNull()
  })

  it('resolve: true sin nota interna → 400 sin publicar ni resolver', async () => {
    const ticket = ticketOf('en_progreso')
    const messages = ticket.messages.length
    for (const internalNote of [undefined, null, '', '   ']) {
      const result = await post(ticket.code, { ...VALID, internalNote, resolve: true })
      expect(result).toMatchObject({ status: 400, body: { error: 'validation_error' } })
      expect(result.body.message).toMatch(/nota interna/)
    }
    expect(fresh(ticket).status).toBe('en_progreso')
    expect(fresh(ticket).messages).toHaveLength(messages)
  })

  it('resolve: true reemplaza la resolución interna que hubiera', async () => {
    const ticket = ticketOf('esperando_cliente')
    ticket.internalResolution = {
      text: 'Resolución anterior.',
      updatedAt: ticket.openedAt,
      updatedBy: { userId: 'u-staff-1', name: STAFF_NAME },
    }
    const { status } = await post(ticket.code, {
      ...VALID,
      internalNote: '  Resolución nueva.  ',
      resolve: true,
    })
    expect(status).toBe(201)
    expect(fresh(ticket).internalResolution).toMatchObject({
      text: 'Resolución nueva.',
      updatedBy: { name: STAFF_NAME },
    })
    expect(fresh(ticket).status).toBe('resuelto')
  })

  it('resolve: true además resuelve; sobre un resuelto da 409 sin publicar nada', async () => {
    const ticket = ticketOf('en_progreso')
    const { status, body } = await post(ticket.code, {
      ...VALID,
      internalNote: 'Causa: vigencia vacía.',
      resolve: true,
    })
    expect(status).toBe(201)
    expect(body.ticket.status).toBe('resuelto')
    const saved = fresh(ticket)
    expect(saved.resolvedAt).not.toBeNull()
    expect(saved.internalResolution.text).toBe('Causa: vigencia vacía.')
    expect(saved.statusHistory.at(-1)).toMatchObject({ to: 'resuelto', byType: 'smarteam' })

    const messages = saved.messages.length
    const workLog = saved.workLog.length
    const again = await post(ticket.code, { ...VALID, internalNote: 'Otra.', resolve: true })
    expect(again).toMatchObject({ status: 409, body: { error: 'invalid_transition' } })
    expect((await post(ticket.code, VALID)).status).toBe(409)
    expect(fresh(ticket).messages).toHaveLength(messages)
    expect(fresh(ticket).workLog).toHaveLength(workLog)
  })

  it('idempotencia: misma key y mismo token → misma respuesta sin duplicar', async () => {
    const ticket = ticketOf('esperando_cliente')
    const messages = ticket.messages.length
    const headers = { 'Idempotency-Key': 'cierre-123' }
    const first = await post(ticket.code, VALID, { headers })
    const second = await post(ticket.code, VALID, { headers })
    expect(second).toEqual(first)
    expect(fresh(ticket).messages).toHaveLength(messages + 1)
    expect(fresh(ticket).workLog).toHaveLength(1)

    // Mismas llaves en otro orden: es el mismo cuerpo.
    const reordered = await post(
      ticket.code,
      { hours: VALID.hours, internalNote: VALID.internalNote, summary: VALID.summary },
      { headers },
    )
    expect(reordered).toEqual(first)

    // Misma key con otro cuerpo: 422 sin publicar.
    const reused = await post(ticket.code, { ...VALID, hours: 2 }, { headers })
    expect(reused).toMatchObject({ status: 422, body: { error: 'idempotency_key_reused' } })
    expect(fresh(ticket).workLog).toHaveLength(1)

    // Otra key sí publica de nuevo.
    await post(ticket.code, VALID, { headers: { 'Idempotency-Key': 'cierre-124' } })
    expect(fresh(ticket).workLog).toHaveLength(2)
  })

  it('un cambio de espacios es el mismo cuerpo (la huella usa los campos normalizados)', async () => {
    const ticket = ticketOf('esperando_cliente')
    const headers = { 'Idempotency-Key': 'espacios-1' }
    const first = await post(ticket.code, { ...VALID, crmProjectId: '' }, { headers })
    const spaced = await post(
      ticket.code,
      { ...VALID, summary: `  ${VALID.summary}\n`, internalNote: '   ', crmProjectId: null },
      { headers },
    )
    expect(spaced).toEqual(first)
    expect(fresh(ticket).workLog).toHaveLength(1)
  })

  it('la misma key con otro token no choca: cada token tiene las suyas', async () => {
    const ticket = ticketOf('esperando_cliente')
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const { token } = await apiFetch('/account/api-tokens', {
      method: 'POST',
      json: { name: 'Otro equipo', currentPassword: DEMO_ACCOUNTS.smarteam.password },
    })
    const headers = { 'Idempotency-Key': 'cierre-1' }
    expect((await post(ticket.code, VALID, { headers })).status).toBe(201)
    expect((await post(ticket.code, { ...VALID, hours: 2 }, { headers, token })).status).toBe(201)
    expect(fresh(ticket).workLog).toHaveLength(2)
  })

  it('Idempotency-Key: 1 a 128 de [A-Za-z0-9._:-]; si no → 400', async () => {
    const ticket = ticketOf('esperando_cliente')
    for (const key of ['   ', 'k'.repeat(129), 'con espacio', 'ñandú', 'a/b', 'a+b']) {
      const result = await post(ticket.code, VALID, { headers: { 'Idempotency-Key': key } })
      expect(result).toMatchObject({ status: 400, body: { error: 'validation_error' } })
    }
    expect(fresh(ticket).workLog ?? []).toHaveLength(0)
    for (const key of ['k'.repeat(128), 'A1._:-z']) {
      const ok = await post(ticket.code, VALID, { headers: { 'Idempotency-Key': key } })
      expect(ok.status).toBe(201)
    }
  })

  it('nota interna y proyecto vacíos se guardan y devuelven como null', async () => {
    const ticket = ticketOf('esperando_cliente')
    const { body } = await post(ticket.code, { ...VALID, internalNote: '   ', crmProjectId: '' })
    expect(body.entry).toMatchObject({ internalNote: null, crmProjectId: null })
    const omitted = await post(ticket.code, { summary: VALID.summary, hours: 1 })
    expect(omitted.body.entry).toMatchObject({ internalNote: null, crmProjectId: null })
    expect(fresh(ticket).workLog.map((entry) => entry.internalNote)).toEqual([null, null])
  })

  it('valida horas, resumen, nota y proyecto → 400 sin publicar', async () => {
    const ticket = ticketOf('esperando_cliente')
    const messages = ticket.messages.length
    const invalid = [
      { ...VALID, hours: 0 },
      { ...VALID, hours: 0.1 },
      { ...VALID, hours: 1.3 },
      { ...VALID, hours: 24.25 },
      { ...VALID, hours: '2' },
      { ...VALID, hours: '2.5' },
      { ...VALID, hours: null },
      { ...VALID, summary: '   ' },
      { ...VALID, summary: 'x'.repeat(5001) },
      { ...VALID, internalNote: 'x'.repeat(5001) },
      { ...VALID, crmProjectId: 'x'.repeat(65) },
      { ...VALID, crmProjectId: 'proyecto 12' },
      { ...VALID, crmProjectId: 'p/12' },
      { ...VALID, crmProjectId: 1234 },
      { ...VALID, resolve: 'sí' },
    ]
    for (const json of invalid) {
      expect(await post(ticket.code, json)).toMatchObject({
        status: 400,
        body: { error: 'validation_error' },
      })
    }
    expect(fresh(ticket).messages).toHaveLength(messages)
    expect((await post(ticket.code, { ...VALID, crmProjectId: 'Ab_12-x' })).status).toBe(201)
    expect((await post(ticket.code, { ...VALID, crmProjectId: 'x'.repeat(64) })).status).toBe(201)
    expect((await post(ticket.code, { ...VALID, hours: 24 })).status).toBe(201)
    expect((await post(ticket.code, { ...VALID, hours: 0.25 })).status).toBe(201)
  })

  it('también acepta la sesión de Smarteam (con X-Panel-Request); el cliente no', async () => {
    const ticket = ticketOf('esperando_cliente')
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const result = await apiFetch(`/staff/tickets/by-code/${ticket.code}/work-log`, {
      method: 'POST',
      json: VALID,
    })
    expect(result.entry.author.name).toBe(STAFF_NAME)
    // Sin el header de la defensa CSRF, la sesión no basta.
    expect((await post(ticket.code, VALID, { token: null })).status).toBe(403)

    signInAs(DEMO_ACCOUNTS.clienteUsuario.email)
    expect((await call(`/staff/tickets/by-code/${ticket.code}`, { token: null })).status).toBe(403)
  })

  it('el seed trae registro de trabajo en un ticket de ACME (4,25 h)', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const ticket = getDb().tickets.find((one) => one.workLog?.length)
    const detail = await apiFetch(`/staff/tenants/${ticket.tenantKey}/tickets/${ticket.id}`)
    expect(detail.workLog.totalHours).toBe(4.25)
    expect(detail.workLog.entries.map((entry) => entry.hours)).toEqual([3.5, 0.75])
    const messageIds = detail.messages.map((message) => message.id)
    for (const entry of detail.workLog.entries) expect(messageIds).toContain(entry.messageId)
  })
})
