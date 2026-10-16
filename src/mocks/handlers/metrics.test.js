import { beforeEach, describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const clientEmail = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staffEmail = DEMO_ACCOUNTS.smarteam.email
const TZ = 'America/Costa_Rica'
// Dos semanas: lunes 28-09 y lunes 05-10 (Costa Rica, UTC−6).
const PERIOD = { from: '2026-09-28T06:00:00.000Z', to: '2026-10-12T06:00:00.000Z', tz: TZ }
const HOUR = 3600

let sequence = 0
const at = (iso, plusHours = 0) => new Date(Date.parse(iso) + plusHours * HOUR * 1000).toISOString()
function ticket({
  opened,
  firstResponse = null,
  resolved = null,
  status = 'resuelto',
  category = 'documentos',
  reopenCount = 0,
}) {
  sequence += 1
  return {
    id: `t-testco-${sequence}`,
    tenantKey: 'TESTCO',
    number: sequence,
    code: `TESTCO-${sequence}`,
    title: `Ticket ${sequence}`,
    category,
    status,
    openedAt: opened,
    firstResponseAt: firstResponse === null ? null : at(opened, firstResponse),
    resolvedAt: resolved === null ? null : at(opened, resolved),
    reopenCount,
    statusHistory: [],
    messages: [],
    attachments: [],
  }
}

const TESTCO_TICKETS = [
  ticket({ opened: '2026-09-28T15:00:00.000Z', firstResponse: 1, resolved: 2 }), // < 4 h
  ticket({ opened: '2026-09-29T15:00:00.000Z', firstResponse: 3, resolved: 10, reopenCount: 1 }), // 4 a 24 h
  ticket({
    opened: '2026-10-01T15:00:00.000Z',
    firstResponse: 0.5,
    resolved: 48,
    category: 'sincronizacion',
  }), // 1 a 3 d
  ticket({
    opened: '2026-10-02T15:00:00.000Z',
    firstResponse: 2,
    resolved: 100,
    category: 'precios',
  }), // > 3 d, semana del 05-10
  // Resuelto en el período anterior.
  ticket({ opened: '2026-09-20T15:00:00.000Z', firstResponse: 1, resolved: 2 }),
  // Abiertos ahora (no dependen del período).
  ticket({ opened: '2026-10-08T15:00:00.000Z', firstResponse: 1, status: 'en_progreso' }),
  ticket({ opened: '2026-10-10T15:00:00.000Z', status: 'abierto', category: 'acceso' }),
  // Abierto en el período, se resuelve después: cuenta su primera respuesta, no su resolución.
  ticket({ opened: '2026-10-11T15:00:00.000Z', firstResponse: 1, resolved: 19 }),
  // Reabierto hoy: tuvo una resolución en el período, pero ya no está resuelto.
  ticket({
    opened: '2026-09-15T15:00:00.000Z',
    firstResponse: 1,
    resolved: 22 * 24,
    status: 'abierto',
    category: 'mapeos',
    reopenCount: 1,
  }),
]

const staffMetrics = (query = {}) =>
  apiFetch('/staff/tickets/metrics', { query: { ...PERIOD, tenantKey: 'TESTCO', ...query } })

describe('métricas de tickets (F7 a F9)', () => {
  beforeEach(() => {
    getDb().tenants.push({
      tenantKey: 'TESTCO',
      companyName: 'Empresa de prueba',
      status: 'active',
    })
    getDb().tickets.push(...TESTCO_TICKETS.map((t) => structuredClone(t)))
    signInAs(staffEmail)
  })

  it('totales: resueltos (y del período anterior), reabiertos, abiertos ahora y medianas', async () => {
    const body = await staffMetrics()
    expect(body.period).toEqual(PERIOD)
    expect(body.totals).toEqual({
      resolved: 4,
      resolvedPreviousPeriod: 1,
      reopened: 1,
      open: 3,
      openWithoutFirstResponse: 1,
      medianFirstResponseSeconds: 3600, // abiertos en el período: 1 h, 3 h, 30 min, 2 h, 1 h, 1 h
      medianResolutionSeconds: 104_400, // (10 h + 48 h) / 2
    })
  })

  it('semanas desde el lunes en la zona pedida, rangos y categorías', async () => {
    const body = await staffMetrics()
    expect(body.byWeek).toEqual([
      { weekStart: '2026-09-28', resolved: 3, reopened: 1, medianResolutionSeconds: 10 * HOUR },
      { weekStart: '2026-10-05', resolved: 1, reopened: 0, medianResolutionSeconds: 100 * HOUR },
    ])
    expect(body.buckets).toEqual([
      { key: 'lt4h', count: 1 },
      { key: '4h_24h', count: 1 },
      { key: '1d_3d', count: 1 },
      { key: 'gt3d', count: 1 },
    ])
    expect(body.byCategory).toEqual([
      { category: 'documentos', resolved: 2, medianResolutionSeconds: 6 * HOUR },
      { category: 'precios', resolved: 1, medianResolutionSeconds: 100 * HOUR },
      { category: 'sincronizacion', resolved: 1, medianResolutionSeconds: 48 * HOUR },
    ])
  })

  it('Smarteam: tabla por empresa y filtro por categoría', async () => {
    expect((await staffMetrics()).byTenant).toEqual([
      {
        tenantKey: 'TESTCO',
        companyName: 'Empresa de prueba',
        resolved: 4,
        medianFirstResponseSeconds: 3600,
        medianResolutionSeconds: 104_400,
        reopened: 1,
        open: 3,
      },
    ])
    const documents = await staffMetrics({ category: 'documentos' })
    expect(documents.totals).toMatchObject({ resolved: 2, open: 1, openWithoutFirstResponse: 0 })
    expect(documents.byCategory.map((row) => row.category)).toEqual(['documentos'])
  })

  it('sin tickets en el período: ceros, semanas vacías y medianas nulas', async () => {
    const body = await staffMetrics({
      from: '2024-01-01T06:00:00.000Z',
      to: '2024-01-15T06:00:00.000Z',
    })
    expect(body.totals).toMatchObject({
      resolved: 0,
      medianResolutionSeconds: null,
      medianFirstResponseSeconds: null,
    })
    expect(body.byWeek.map((week) => week.resolved)).toEqual([0, 0])
    expect(body.buckets.map((bucket) => bucket.count)).toEqual([0, 0, 0, 0])
    expect(body.byCategory).toEqual([])
  })

  it('validación y rutas', async () => {
    expect(await fail(staffMetrics({ tz: 'Marte/Olimpo' }))).toMatchObject({ status: 400 })
    expect(await fail(staffMetrics({ category: 'inventada' }))).toMatchObject({ status: 400 })
    expect(await fail(staffMetrics({ tenantKey: 'NOPE' }))).toMatchObject({ status: 404 })
    expect(await fail(apiFetch('/tickets/metrics', { query: PERIOD }))).toMatchObject({
      status: 403,
    })
    signInAs(clientEmail)
    expect(await fail(apiFetch('/staff/tickets/metrics', { query: PERIOD }))).toMatchObject({
      status: 403,
    })
  })
})

describe('métricas de tickets con el seed', () => {
  const LAST_90 = { from: '2026-07-14T06:00:00.000Z', to: '2026-10-12T06:00:00.000Z', tz: TZ }

  it('cliente: solo su empresa y nunca la tabla por empresa', async () => {
    signInAs(clientEmail)
    const mine = await apiFetch('/tickets/metrics', { query: LAST_90 })
    expect(mine).not.toHaveProperty('byTenant')
    expect(mine.totals.resolved).toBeGreaterThan(20)
    expect(mine.byWeek).toHaveLength(13) // lunes del 13-07 al 05-10

    signInAs(staffEmail)
    const staff = await apiFetch('/staff/tickets/metrics', {
      query: { ...LAST_90, tenantKey: 'ACME' },
    })
    expect(staff.totals).toEqual(mine.totals)
    expect(staff.byTenant.map((row) => row.tenantKey)).toEqual(['ACME'])
  })

  it('Smarteam sin filtro: todas las empresas, la de más resueltos primero; 12 meses permitidos', async () => {
    signInAs(staffEmail)
    const all = await apiFetch('/staff/tickets/metrics', {
      query: { from: '2025-10-12T06:00:00.000Z', to: '2026-10-12T06:00:00.000Z', tz: TZ },
    })
    expect(all.byTenant.map((row) => row.tenantKey)).toEqual(['ACME', 'GLOBEX', 'INITECH'])
    const sum = all.byTenant.reduce((total, row) => total + row.resolved, 0)
    expect(sum).toBe(all.totals.resolved)
    expect(all.byWeek.length).toBeGreaterThanOrEqual(52)
  })
})
