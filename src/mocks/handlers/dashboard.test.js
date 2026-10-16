import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { getDb, signInAs } from '../db'
import { tenantEvents } from '../operations'
import { DEMO_ACCOUNTS } from '../seed'
import { INTERNAL, SEED_OPERATIONS } from '../seed-events'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const clientEmail = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staffEmail = DEMO_ACCOUNTS.smarteam.email
const TZ = 'America/Costa_Rica'
// 5, 6 y 7 de octubre en Costa Rica (UTC−6), `to` exclusivo.
const PERIOD = { from: '2026-10-05T06:00:00.000Z', to: '2026-10-08T06:00:00.000Z', tz: TZ }

let sequence = 0
function rawEvent({ status, reference, at, seconds = 0, lastError = null, document = null }) {
  sequence += 1
  const created = Date.parse(at)
  return {
    _id: `ev-testco-${sequence}`,
    tenantKey: 'TESTCO',
    eventType: 'createQuotation',
    status,
    retryCount: 0,
    maxRetries: 3,
    lastError,
    dedupActive: false,
    payload: { deal: { [INTERNAL.OBJECT_ID_FIELD]: reference, dealname: `Negocio ${reference}` } },
    [INTERNAL.AUDIT_FIELD]: { steps: [], destinationDocument: document },
    createdAt: new Date(created).toISOString(),
    updatedAt: new Date(created + seconds * 1000).toISOString(),
  }
}

const FISCAL = 'La identificación fiscal del cliente está incompleta.'
const TESTCO_EVENTS = [
  rawEvent({
    status: 'errored',
    reference: 'A',
    at: '2026-10-05T14:00:00Z',
    seconds: 600,
    lastError: 'Tiempo de espera agotado al llamar al sistema destino.',
  }),
  rawEvent({
    status: 'completed',
    reference: 'A',
    at: '2026-10-05T15:00:00Z',
    seconds: 40,
    document: '5001',
  }),
  rawEvent({
    status: INTERNAL.ORDER_CREATED,
    reference: 'B',
    at: '2026-10-05T16:00:00Z',
    seconds: 60,
  }),
  rawEvent({
    status: INTERNAL.CREATED_ORIGIN_ERROR,
    reference: 'C',
    at: '2026-10-06T15:00:00Z',
    seconds: 80,
    lastError: 'Documento creado; el origen lo rechazó.',
  }),
  rawEvent({
    status: 'errored',
    reference: 'D',
    at: '2026-10-06T16:00:00Z',
    seconds: 300,
    lastError: FISCAL,
  }),
  rawEvent({ status: 'waiting', reference: 'E', at: '2026-10-07T15:00:00Z' }),
  rawEvent({ status: INTERNAL.IN_PROCESS, reference: 'F', at: '2026-10-07T16:00:00Z' }),
  rawEvent({
    status: 'errored',
    reference: 'G',
    at: '2026-10-07T17:00:00Z',
    seconds: 120,
    lastError: 'Respuesta inesperada del servidor (500).',
  }),
  // 21:00 del 7 en Costa Rica, pero ya 8 en UTC: cuenta en el día local 7.
  rawEvent({
    status: 'errored',
    reference: 'D',
    at: '2026-10-08T03:00:00Z',
    seconds: 200,
    lastError: FISCAL,
  }),
  // Fuera del período y reporte de calidad: no cuentan.
  rawEvent({ status: 'completed', reference: 'H', at: '2026-09-01T15:00:00Z', seconds: 30 }),
  rawEvent({ status: INTERNAL.REPORT, reference: 'I', at: '2026-10-06T15:00:00Z' }),
]

function summary(path = '/staff/tenants/TESTCO/dashboard/integration', query = PERIOD) {
  return apiFetch(path, { query })
}

describe('resumen de integración (F1 a F6)', () => {
  beforeEach(() => {
    getDb().tenants.push({
      tenantKey: 'TESTCO',
      companyName: 'Empresa de prueba',
      status: 'active',
    })
    SEED_OPERATIONS.events.push(...TESTCO_EVENTS)
    signInAs(staffEmail)
  })
  afterEach(() => {
    SEED_OPERATIONS.events.splice(SEED_OPERATIONS.events.length - TESTCO_EVENTS.length)
  })

  it('totales: creados, con error y pendientes según F3; referencias, duraciones y el pendiente más antiguo', async () => {
    const body = await summary()
    expect(body.period).toEqual(PERIOD)
    expect(body.totals).toEqual({
      documents: 9,
      created: 3,
      errored: 4,
      pending: 2,
      references: 7,
      referencesWithoutDocument: 4, // D, E, F y G
      avgDurationSeconds: 200, // terminados: (600+40+60+80+300+120+200) / 7
      avgDurationCreatedSeconds: 60,
      oldestPendingAt: '2026-10-07T15:00:00.000Z',
    })
  })

  it('días locales en la zona pedida, todos los del período (F4)', async () => {
    const body = await summary(undefined, { ...PERIOD, to: '2026-10-09T06:00:00.000Z' })
    expect(body.byDay).toEqual([
      { date: '2026-10-05', created: 2, errored: 1, pending: 0 },
      { date: '2026-10-06', created: 1, errored: 1, pending: 0 },
      { date: '2026-10-07', created: 0, errored: 2, pending: 2 },
      { date: '2026-10-08', created: 0, errored: 0, pending: 0 },
    ])
  })

  it('causas y grupos del catálogo; lo desconocido va a "Otro error" (F5)', async () => {
    const body = await summary()
    expect(body.causes).toEqual([
      {
        key: 'fiscal_id_incomplete',
        label: 'Identificación fiscal incompleta',
        group: 'fiscal_data',
        count: 2,
      },
      { key: 'timeout', label: 'Tiempo de espera agotado', group: 'connectivity', count: 1 },
      { key: 'other', label: 'Otro error', group: 'other', count: 1 },
    ])
    expect(body.groups).toEqual([
      { key: 'fiscal_data', count: 2 },
      { key: 'connectivity', count: 1 },
      { key: 'other', count: 1 },
    ])
  })

  it('negocios con más de un intento, el más reciente primero en el empate (F6)', async () => {
    const { multiAttempt } = await summary()
    expect(multiAttempt.total).toBe(2)
    expect(multiAttempt.items).toEqual([
      {
        reference: 'D',
        title: 'Negocio D',
        attempts: 2,
        resolvedAfterSeconds: null,
        steps: [
          {
            at: '2026-10-06T16:00:00.000Z',
            status: 'errored',
            summary: 'Identificación fiscal incompleta',
            documentNumber: null,
          },
          {
            at: '2026-10-08T03:00:00.000Z',
            status: 'errored',
            summary: 'Identificación fiscal incompleta',
            documentNumber: null,
          },
        ],
      },
      {
        reference: 'A',
        title: 'Negocio A',
        attempts: 2,
        resolvedAfterSeconds: 3640, // del primer intento a que se creó el documento
        steps: [
          {
            at: '2026-10-05T14:00:00.000Z',
            status: 'errored',
            summary: 'Tiempo de espera agotado',
            documentNumber: null,
          },
          {
            at: '2026-10-05T15:00:00.000Z',
            status: 'completed',
            summary: 'Documento creado',
            documentNumber: '5001',
          },
        ],
      },
    ])
  })

  it('sin documentos en el período: ceros, listas vacías y nulos', async () => {
    const body = await summary(undefined, {
      ...PERIOD,
      from: '2026-08-01T06:00:00.000Z',
      to: '2026-08-03T06:00:00.000Z',
    })
    expect(body.totals).toMatchObject({
      documents: 0,
      avgDurationSeconds: null,
      oldestPendingAt: null,
    })
    expect(body.byDay).toHaveLength(2)
    expect(body.causes).toEqual([])
    expect(body.multiAttempt).toEqual({ total: 0, items: [] })
  })

  it('validación: zona y fechas obligatorias, máximo 366 días (F4)', async () => {
    for (const query of [
      { ...PERIOD, tz: undefined },
      { ...PERIOD, tz: 'Marte/Olimpo' },
      { ...PERIOD, from: undefined },
      { ...PERIOD, from: '2025-09-01T06:00:00.000Z' },
    ]) {
      expect(await fail(summary(undefined, query))).toMatchObject({
        status: 400,
        code: 'validation_error',
      })
    }
  })
})

describe('resumen de integración con el seed', () => {
  const LAST_30 = { from: '2026-09-12T06:00:00.000Z', to: '2026-10-13T06:00:00.000Z', tz: TZ }

  it('cliente: solo su empresa; Smarteam ve lo mismo eligiendo la empresa', async () => {
    signInAs(clientEmail)
    const mine = await apiFetch('/dashboard/integration', { query: LAST_30 })
    const inPeriod = tenantEvents('ACME').filter(
      (e) => e.createdAt >= LAST_30.from && e.createdAt < LAST_30.to,
    )
    expect(mine.totals.documents).toBe(inPeriod.length)
    expect(mine.byDay).toHaveLength(31)
    expect(mine.causes.length).toBeGreaterThanOrEqual(5)
    expect(new Set(mine.causes.map((c) => c.group)).size).toBeGreaterThanOrEqual(4)
    expect(mine.multiAttempt.items.length).toBeLessThanOrEqual(10)
    const attempts = mine.multiAttempt.items.map((item) => item.attempts)
    expect(attempts).toEqual([...attempts].sort((a, b) => b - a))

    signInAs(staffEmail)
    expect(await apiFetch('/staff/tenants/ACME/dashboard/integration', { query: LAST_30 })).toEqual(
      mine,
    )
  })

  it('rutas: empresa inexistente → 404; cliente en /staff y Smarteam en la de cliente → 403', async () => {
    signInAs(staffEmail)
    expect(
      await fail(apiFetch('/staff/tenants/NOPE/dashboard/integration', { query: LAST_30 })),
    ).toMatchObject({ status: 404 })
    expect(await fail(apiFetch('/dashboard/integration', { query: LAST_30 }))).toMatchObject({
      status: 403,
    })
    signInAs(clientEmail)
    expect(
      await fail(apiFetch('/staff/tenants/ACME/dashboard/integration', { query: LAST_30 })),
    ).toMatchObject({ status: 403 })
  })
})
