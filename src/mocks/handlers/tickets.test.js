import { describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'
import { makeImageFile } from '@/test/files'

import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'
import { setFailingTenants } from '../tickets-db'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const clientEmail = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staffEmail = DEMO_ACCOUNTS.smarteam.email

function form(fields, images = []) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.append(key, value)
  for (const image of images) data.append('images', image)
  return data
}

const ticketOf = (tenantKey, status) =>
  getDb().tickets.find(
    (ticket) => ticket.tenantKey === tenantKey && (!status || ticket.status === status),
  )

const clientDetail = (id) => apiFetch(`/tickets/${id}`)
const staffDetail = (ticket) => apiFetch(`/staff/tenants/${ticket.tenantKey}/tickets/${ticket.id}`)
const staffPost = (ticket, action, options) =>
  apiFetch(`/staff/tenants/${ticket.tenantKey}/tickets/${ticket.id}/${action}`, {
    method: 'POST',
    ...options,
  })

describe('mocks de tickets: cliente', () => {
  it('lista solo los tickets de su empresa, sin mensajes ni resolución interna', async () => {
    signInAs(clientEmail)
    const page = await apiFetch('/tickets', { query: { pageSize: 100 } })
    const acme = getDb().tickets.filter((ticket) => ticket.tenantKey === 'ACME')
    expect(page.total).toBe(acme.length)
    for (const item of page.items) {
      expect(item.code).toMatch(/^ACME-/)
      expect(item).not.toHaveProperty('messages')
      expect(item).not.toHaveProperty('internalResolution')
    }
  })

  it('filtra por estado y categoría y ordena por última actividad', async () => {
    signInAs(clientEmail)
    const page = await apiFetch('/tickets', { query: { status: 'resuelto', pageSize: 100 } })
    expect(page.items.every((item) => item.status === 'resuelto')).toBe(true)
    const dates = page.items.map((item) => item.lastActivityAt)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('el detalle de otra empresa da 404 y nunca trae internalResolution', async () => {
    signInAs(clientEmail)
    const globex = ticketOf('GLOBEX')
    expect(await fail(clientDetail(globex.id))).toMatchObject({ status: 404, code: 'not_found' })

    const resolved = ticketOf('ACME', 'resuelto')
    const detail = await clientDetail(resolved.id)
    expect(resolved.internalResolution).not.toBeNull()
    expect(detail).not.toHaveProperty('internalResolution')
  })

  it('crear: valida, numera por empresa y acepta imágenes válidas', async () => {
    signInAs(clientEmail)
    const before = getDb().ticketCounters.ACME
    expect(
      await fail(
        apiFetch('/tickets', {
          method: 'POST',
          formData: form({ title: '', description: 'x', category: 'otro' }),
        }),
      ),
    ).toMatchObject({ status: 400, code: 'validation_error' })

    const created = await apiFetch('/tickets', {
      method: 'POST',
      formData: form({ title: 'Nuevo', description: 'Detalle', category: 'otro' }, [
        makeImageFile('png'),
      ]),
    })
    expect(created.code).toBe(`ACME-${String(before + 1).padStart(4, '0')}`)
    expect(created).not.toHaveProperty('internalResolution')
    expect(created.attachments).toHaveLength(1)
    expect(created.status).toBe('abierto')
  })

  it('crear: rechaza imágenes inválidas como el servidor', async () => {
    signInAs(clientEmail)
    const base = { title: 'X', description: 'Y', category: 'otro' }
    const post = (images) =>
      fail(apiFetch('/tickets', { method: 'POST', formData: form(base, images) }))
    expect(await post(Array.from({ length: 6 }, () => makeImageFile('png')))).toMatchObject({
      code: 'too_many_images',
    })
    expect(await post([makeImageFile('svg', { name: 'x.png', type: 'image/png' })])).toMatchObject({
      code: 'invalid_image',
    })
    expect(await post([makeImageFile('png', { size: 5 * 1024 * 1024 + 1 })])).toMatchObject({
      status: 413,
      code: 'image_too_large',
    })
  })

  it('crear con contexto: solo registros de su empresa', async () => {
    signInAs(clientEmail)
    const base = {
      title: 'X',
      description: 'Y',
      category: 'documentos',
      contextType: 'webhookEvent',
    }
    const ok = await apiFetch('/tickets', {
      method: 'POST',
      formData: form({ ...base, contextId: 'ev-acme-001' }),
    })
    expect(ok.context).toMatchObject({ type: 'webhookEvent', refId: 'ev-acme-001' })
    expect(
      await fail(
        apiFetch('/tickets', {
          method: 'POST',
          formData: form({ ...base, contextId: 'ev-globex-001' }),
        }),
      ),
    ).toMatchObject({ status: 404 })
  })

  it('responder en esperando_cliente lo pasa a en_progreso; en resuelto da 409', async () => {
    signInAs(clientEmail)
    const waiting = ticketOf('ACME', 'esperando_cliente')
    const reply = (id) =>
      apiFetch(`/tickets/${id}/messages`, {
        method: 'POST',
        formData: form({ body: 'Ahí va el dato' }),
      })
    expect((await reply(waiting.id)).status).toBe('en_progreso')
    expect(await fail(reply(ticketOf('ACME', 'resuelto').id))).toMatchObject({
      status: 409,
      code: 'invalid_transition',
    })
  })

  it('"Sigue fallando": solo desde resuelto, exige mensaje y suma reapertura', async () => {
    signInAs(clientEmail)
    const resolved = ticketOf('ACME', 'resuelto')
    const reopen = (json) => apiFetch(`/tickets/${resolved.id}/reopen`, { method: 'POST', json })
    expect(await fail(reopen({ message: '' }))).toMatchObject({ status: 400 })
    const before = resolved.reopenCount
    const detail = await reopen({ message: 'Volvió a pasar' })
    expect(detail).toMatchObject({ status: 'abierto', reopenCount: before + 1 })
    expect(await fail(reopen({ message: 'otra vez' }))).toMatchObject({ status: 409 })
  })

  it('imágenes: sirve las del ticket y da 404 con un fileId de otro ticket', async () => {
    signInAs(clientEmail)
    const withImage = getDb().tickets.find(
      (t) => t.tenantKey === 'ACME' && t.attachments.length > 0,
    )
    const other = getDb().tickets.find((t) => t.tenantKey === 'ACME' && t.id !== withImage.id)
    const fileId = withImage.attachments[0].fileId
    const ok = await fetch(
      new URL(`/api/tickets/${withImage.id}/attachments/${fileId}`, window.location.origin),
    )
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-type')).toBe('image/png')
    expect(ok.headers.get('x-content-type-options')).toBe('nosniff')
    const wrong = await fetch(
      new URL(`/api/tickets/${other.id}/attachments/${fileId}`, window.location.origin),
    )
    expect(wrong.status).toBe(404)
  })

  it('hasNews del cliente: se apaga al abrir el detalle', async () => {
    signInAs(clientEmail)
    const findItem = async (id) =>
      (await apiFetch('/tickets', { query: { pageSize: 100 } })).items.find(
        (item) => item.id === id,
      )
    const waiting = ticketOf('ACME', 'esperando_cliente')
    expect((await findItem(waiting.id)).hasNews).toBe(true)
    await clientDetail(waiting.id)
    expect((await findItem(waiting.id)).hasNews).toBe(false)
  })

  it('una cuenta Smarteam no usa la API de cliente', async () => {
    signInAs(staffEmail)
    expect(await fail(apiFetch('/tickets'))).toMatchObject({ status: 403, code: 'forbidden' })
  })
})

describe('mocks de tickets: Smarteam', () => {
  it('un cliente recibe 403 en la bandeja', async () => {
    signInAs(clientEmail)
    expect(await fail(apiFetch('/staff/tickets'))).toMatchObject({ status: 403, code: 'forbidden' })
  })

  it('bandeja con todas las empresas, filtros, warnings y tope de 1000', async () => {
    signInAs(staffEmail)
    const all = await apiFetch('/staff/tickets', { query: { pageSize: 100 } })
    expect(all.total).toBe(getDb().tickets.length)
    expect(new Set(all.items.map((item) => item.tenantKey))).toEqual(
      new Set(['ACME', 'GLOBEX', 'INITECH']),
    )
    expect(all.warnings).toEqual([])

    const acmeOpen = await apiFetch('/staff/tickets', {
      query: { tenantKey: 'ACME', status: 'abierto' },
    })
    expect(acmeOpen.items.every((i) => i.tenantKey === 'ACME' && i.status === 'abierto')).toBe(true)

    setFailingTenants(['GLOBEX'])
    const partial = await apiFetch('/staff/tickets', { query: { pageSize: 100 } })
    expect(partial.warnings).toEqual([{ tenantKey: 'GLOBEX', error: expect.any(String) }])
    expect(partial.items.some((item) => item.tenantKey === 'GLOBEX')).toBe(false)

    expect(
      await fail(apiFetch('/staff/tickets', { query: { page: 11, pageSize: 100 } })),
    ).toMatchObject({
      code: 'page_window_exceeded',
    })
  })

  it('summary cuenta por estado y por empresa', async () => {
    signInAs(staffEmail)
    const summary = await apiFetch('/staff/tickets/summary')
    const total = Object.values(summary.byStatus).reduce((a, b) => a + b, 0)
    expect(total).toBe(getDb().tickets.length)
    expect(summary.byTenant.map((t) => t.tenantKey)).toEqual(['ACME', 'GLOBEX', 'INITECH'])
  })

  it('detalle con resolución interna; tenant inexistente o equivocado da 404', async () => {
    signInAs(staffEmail)
    const resolved = ticketOf('ACME', 'resuelto')
    expect((await staffDetail(resolved)).internalResolution).toMatchObject({
      text: expect.any(String),
    })
    expect(await fail(apiFetch(`/staff/tenants/NOPE/tickets/${resolved.id}`))).toMatchObject({
      status: 404,
    })
    expect(await fail(apiFetch(`/staff/tenants/GLOBEX/tickets/${resolved.id}`))).toMatchObject({
      status: 404,
    })
  })

  it('primera respuesta: abierto → en_progreso con firstResponseAt', async () => {
    signInAs(staffEmail)
    const open = getDb().tickets.find((t) => t.status === 'abierto' && !t.firstResponseAt)
    const detail = await staffPost(open, 'messages', { formData: form({ body: 'Lo revisamos' }) })
    expect(detail.status).toBe('en_progreso')
    expect(detail.firstResponseAt).not.toBeNull()
    expect(detail.statusHistory.at(-1)).toMatchObject({
      from: 'abierto',
      to: 'en_progreso',
      byType: 'smarteam',
    })
  })

  it('cambios de estado manuales: solo los del spec', async () => {
    signInAs(staffEmail)
    const working = ticketOf('ACME', 'en_progreso')
    const resolved = ticketOf('GLOBEX', 'resuelto')
    const open = getDb().tickets.find((t) => t.status === 'abierto')
    const setStatus = (ticket, to) => staffPost(ticket, 'status', { json: { to } })

    expect((await setStatus(working, 'esperando_cliente')).status).toBe('esperando_cliente')
    expect((await setStatus(resolved, 'en_progreso')).status).toBe('en_progreso')
    expect(await fail(setStatus(open, 'esperando_cliente'))).toMatchObject({ status: 409 })
    expect(await fail(setStatus(open, 'resuelto'))).toMatchObject({ status: 409 })
  })

  it('resolver exige los dos textos; después queda resuelto con la nota interna', async () => {
    signInAs(staffEmail)
    const working = ticketOf('INITECH', 'en_progreso')
    const resolve = (fields) => staffPost(working, 'resolve', { formData: form(fields) })
    expect(await fail(resolve({ message: 'Listo' }))).toMatchObject({ status: 400 })
    expect(await fail(resolve({ internalResolution: 'Causa' }))).toMatchObject({ status: 400 })
    const detail = await resolve({ message: 'Listo', internalResolution: 'Causa raíz' })
    expect(detail).toMatchObject({ status: 'resuelto', internalResolution: { text: 'Causa raíz' } })
    expect(detail.resolvedAt).not.toBeNull()
    expect(await fail(resolve({ message: 'a', internalResolution: 'b' }))).toMatchObject({
      status: 409,
    })
  })

  it('editar la resolución interna', async () => {
    signInAs(staffEmail)
    const resolved = ticketOf('ACME', 'resuelto')
    const detail = await apiFetch(
      `/staff/tenants/ACME/tickets/${resolved.id}/internal-resolution`,
      { method: 'PUT', json: { text: 'Nota corregida' } },
    )
    expect(detail.internalResolution.text).toBe('Nota corregida')
  })

  it('hasNews de Smarteam: mensaje del cliente → novedad; al abrir el detalle se apaga', async () => {
    signInAs(clientEmail)
    const waiting = ticketOf('ACME', 'esperando_cliente')
    await apiFetch(`/tickets/${waiting.id}/messages`, {
      method: 'POST',
      formData: form({ body: 'Respuesta' }),
    })

    signInAs(staffEmail)
    const findItem = async () =>
      (await apiFetch('/staff/tickets', { query: { pageSize: 100 } })).items.find(
        (i) => i.id === waiting.id,
      )
    expect((await findItem()).hasNews).toBe(true)
    await staffDetail(waiting)
    expect((await findItem()).hasNews).toBe(false)
  })
})
