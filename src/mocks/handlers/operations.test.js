import { describe, expect, it } from 'vitest'

import { eventPageSchema, eventSchema, staffEventDetailSchema } from '@/features/events/schemas'
import { syncDetailSchema, syncPageSchema, syncTasksSchema } from '@/features/syncs/schemas'
import { apiFetch } from '@/lib/api/client'

import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'
import { INTERNAL } from '../seed-events'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const clientEmail = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staffEmail = DEMO_ACCOUNTS.smarteam.email
const all = { pageSize: 100 }

describe('mocks de eventos', () => {
  it('cliente: solo su empresa, ordenados por fecha, sin reportes de calidad y con nombres genéricos', async () => {
    signInAs(clientEmail)
    const page = await apiFetch('/events', { query: all, schema: eventPageSchema })
    expect(page.total).toBe(45)
    expect(page.items.every((event) => event.id.startsWith('ev-acme-'))).toBe(true)
    expect(page.items.some((event) => event.id.includes('-r0'))).toBe(false)
    const dates = page.items.map((event) => event.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    const statuses = new Set(page.items.map((event) => event.status))
    expect(statuses).toEqual(
      new Set([
        'waiting',
        'in_process',
        'destination_created',
        'destination_created_origin_error',
        'completed',
        'errored',
      ]),
    )
    const raw = JSON.stringify(page)
    expect(raw).not.toContain(INTERNAL.ORDER_CREATED)
    expect(raw).not.toContain(INTERNAL.AUDIT_FIELD)
    expect(raw).not.toContain('"payload"')
  })

  it('filtra por estado, tipo, referencia y fechas (from inclusivo, to exclusivo)', async () => {
    signInAs(clientEmail)
    const errored = await apiFetch('/events', { query: { ...all, status: 'errored' } })
    expect(errored.total).toBeGreaterThan(0)
    expect(errored.items.every((event) => event.status === 'errored')).toBe(true)

    const quotes = await apiFetch('/events', { query: { ...all, type: 'createQuotation' } })
    expect(quotes.items.every((event) => event.type === 'createQuotation')).toBe(true)

    const first = await apiFetch('/events/ev-acme-001', { schema: eventSchema })
    const byReference = await apiFetch('/events', { query: { ...all, reference: first.reference } })
    expect(byReference.total).toBeGreaterThan(1)
    expect(byReference.items.every((event) => event.reference === first.reference)).toBe(true)

    const exact = await apiFetch('/events', {
      query: {
        ...all,
        from: first.createdAt,
        to: new Date(Date.parse(first.createdAt) + 1).toISOString(),
      },
    })
    expect(exact.items.map((event) => event.id)).toEqual(['ev-acme-001'])
    const excluded = await apiFetch('/events', { query: { ...all, to: first.createdAt } })
    expect(excluded.items.map((event) => event.id)).not.toContain('ev-acme-001')
  })

  it('valida estado, fechas y pageSize', async () => {
    signInAs(clientEmail)
    for (const query of [
      { status: 'report' },
      { status: INTERNAL.ORDER_CREATED },
      { from: 'ayer' },
      { pageSize: 101 },
    ]) {
      expect(await fail(apiFetch('/events', { query }))).toMatchObject({
        status: 400,
        code: 'validation_error',
      })
    }
  })

  it('detalle del cliente: sin payload ni audit; otra empresa, reporte o inexistente → 404', async () => {
    signInAs(clientEmail)
    const event = await apiFetch('/events/ev-acme-001')
    expect(event).toMatchObject({ id: 'ev-acme-001', status: 'errored', retries: 3, maxRetries: 3 })
    expect(event).not.toHaveProperty('payload')
    expect(event).not.toHaveProperty('audit')
    for (const id of ['ev-globex-001', 'ev-acme-r01', 'no-existe']) {
      expect(await fail(apiFetch(`/events/${id}`))).toMatchObject({ status: 404 })
    }
  })

  it('Smarteam: por empresa (incluida una suspendida); payload y audit con staff.events.raw', async () => {
    signInAs(staffEmail)
    const globex = await apiFetch('/staff/tenants/GLOBEX/events', { query: all })
    expect(globex.total).toBe(20)
    const suspended = await apiFetch('/staff/tenants/INITECH/events', { query: all })
    expect(suspended.total).toBe(8)

    const detail = await apiFetch('/staff/tenants/ACME/events/ev-acme-001', {
      schema: staffEventDetailSchema,
    })
    expect(detail.payload.deal).toBeDefined()
    expect(detail.audit.steps.length).toBeGreaterThan(0)

    getDb().users.find((user) => user.email === staffEmail).permissions = [
      'events.read',
      'syncs.read',
    ]
    const plain = await apiFetch('/staff/tenants/ACME/events/ev-acme-001')
    expect(plain).not.toHaveProperty('payload')
    expect(plain).not.toHaveProperty('audit')
  })

  it('rutas: empresa inexistente → 404; cliente en /staff y Smarteam en la de cliente → 403', async () => {
    signInAs(staffEmail)
    expect(await fail(apiFetch('/staff/tenants/NOPE/events'))).toMatchObject({ status: 404 })
    expect(await fail(apiFetch('/events'))).toMatchObject({ status: 403 })
    signInAs(clientEmail)
    expect(await fail(apiFetch('/staff/tenants/ACME/events'))).toMatchObject({ status: 403 })
  })
})

describe('mocks de syncs', () => {
  it('cliente: corridas de su empresa por inicio descendente, con "running" y tipos genéricos', async () => {
    signInAs(clientEmail)
    const page = await apiFetch('/syncs', { query: all, schema: syncPageSchema })
    expect(page.total).toBe(30)
    const dates = page.items.map((sync) => sync.startedAt)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(page.items[0]).toMatchObject({ status: 'running', finishedAt: null })
    expect(new Set(page.items.map((sync) => sync.task.type))).toEqual(
      new Set(['record_sync', 'dropdown_options']),
    )
    expect(page.items.find((sync) => sync.task.type === 'dropdown_options').objectType).toBeNull()
    const raw = JSON.stringify(page)
    expect(raw).not.toContain(INTERNAL.RECORD_SYNC_TASK)
    expect(raw).not.toContain('"errors"')
  })

  it('tareas (E8): solo id, nombre y tipo; filtrar por tarea, estado y fechas', async () => {
    signInAs(clientEmail)
    const tasks = await apiFetch('/sync-tasks', { schema: syncTasksSchema })
    expect(tasks.items).toHaveLength(3)
    expect(JSON.stringify(tasks)).not.toContain('no-debe-salir')
    expect(Object.keys(tasks.items[0]).sort()).toEqual(['id', 'name', 'type'])

    const contacts = tasks.items.find((task) => task.name === 'Contactos')
    const byTask = await apiFetch('/syncs', { query: { ...all, taskId: contacts.id } })
    expect(byTask.total).toBeGreaterThan(0)
    expect(byTask.items.every((sync) => sync.task.id === contacts.id)).toBe(true)

    const running = await apiFetch('/syncs', { query: { ...all, status: 'running' } })
    expect(running.total).toBe(1)

    const recent = await apiFetch('/syncs', {
      query: {
        ...all,
        from: new Date(Date.parse('2026-10-12T18:00:00.000Z') - 24 * 3_600_000).toISOString(),
      },
    })
    expect(recent.total).toBeGreaterThan(0)
    expect(recent.total).toBeLessThan(30)
  })

  it('detalle: errores paginados aparte (errorsPage, errorsPageSize ≤ 100), error como objeto', async () => {
    signInAs(clientEmail)
    const detail = await apiFetch('/syncs/sync-acme-004', {
      query: { errorsPage: 2, errorsPageSize: 25 },
      schema: syncDetailSchema,
    })
    expect(detail.errors).toMatchObject({ page: 2, pageSize: 25, total: 60 })
    expect(detail.errors.items).toHaveLength(25)
    expect(detail.errorMessage).toMatchObject({ code: 'BATCH_REJECTED' })

    const linked = await apiFetch('/syncs/sync-acme-001')
    expect(linked).toMatchObject({ status: 'errored', counts: { failed: 3 } })
    expect(linked.errors.total).toBe(3)
    expect(linked.skippedReasons).toEqual([{ reason: 'Sin precio en la lista base', count: 2 }])

    expect(
      await fail(apiFetch('/syncs/sync-acme-004', { query: { errorsPageSize: 101 } })),
    ).toMatchObject({ status: 400 })
    expect(await fail(apiFetch('/syncs/sync-globex-001'))).toMatchObject({ status: 404 })
  })

  it('Smarteam: tareas y syncs por empresa; empresa inexistente → 404', async () => {
    signInAs(staffEmail)
    const tasks = await apiFetch('/staff/tenants/GLOBEX/sync-tasks')
    expect(tasks.items.map((task) => task.name)).toEqual(['Productos', 'Empresas'])
    const syncs = await apiFetch('/staff/tenants/INITECH/syncs', { query: all })
    expect(syncs.total).toBe(5)
    expect(await fail(apiFetch('/staff/tenants/NOPE/syncs'))).toMatchObject({ status: 404 })
  })

  it('el selector de empresas acepta a Smarteam aunque solo tenga staff.events.raw', async () => {
    signInAs(staffEmail)
    getDb().users.find((user) => user.email === staffEmail).permissions = [
      'events.read',
      'syncs.read',
      'staff.events.raw',
    ]
    const tenants = await apiFetch('/staff/tenants')
    expect(tenants.items.map((tenant) => tenant.tenantKey)).toContain('INITECH')
  })
})

describe('contexto de tickets con registros reales', () => {
  it('el ticket del seed enlaza el evento real con su snapshot genérico', () => {
    const ticket = getDb().tickets.find((t) => t.context?.refId === 'ev-acme-001')
    expect(ticket.context.snapshot).toMatchObject({ status: 'errored', type: 'createQuotation' })
    expect(JSON.stringify(ticket.context)).not.toContain(INTERNAL.AUDIT_FIELD)
  })
})
