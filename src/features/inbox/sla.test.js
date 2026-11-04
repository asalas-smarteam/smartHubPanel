import { describe, expect, it } from 'vitest'

import {
  formatSlaDuration,
  goalStatus,
  SLA_TARGETS,
  SLA_WARNING_SECONDS,
  slaText,
  ticketSla,
  ticketSlaGoals,
} from './sla'

const HOUR = 3600
const MINUTE = 60
// Horas de Costa Rica (UTC−6) escritas con su offset.
const iso = (local) => new Date(`${local}-06:00`).toISOString()
const cr = (local) => Date.parse(`${local}-06:00`)

// Abierto el lunes 2 de noviembre a las 8:00: la primera respuesta vence el lunes a las 10:00 y
// la resolución (18 h hábiles) el martes a las 17:00.
const OPENED = '2026-11-02T08:00'

const firstResponse = (now, end = null) =>
  goalStatus({
    start: iso(OPENED),
    end: end && iso(end),
    target: SLA_TARGETS.firstResponse,
    now: cr(now),
  })
const resolution = (now, end = null) =>
  goalStatus({
    start: iso(OPENED),
    end: end && iso(end),
    target: SLA_TARGETS.resolution,
    now: cr(now),
  })

const ticket = (overrides = {}) => ({
  openedAt: iso(OPENED),
  firstResponseAt: null,
  resolvedAt: null,
  status: 'abierto',
  ...overrides,
})

describe('constantes del plan 4y', () => {
  it('metas y aviso', () => {
    expect(SLA_TARGETS).toEqual({ firstResponse: 2 * HOUR, resolution: 18 * HOUR })
    expect(Object.isFrozen(SLA_TARGETS)).toBe(true)
    expect(SLA_WARNING_SECONDS).toBe(30 * MINUTE)
  })
})

describe('goalStatus: primera respuesta (2 h hábiles)', () => {
  const dueAt = cr('2026-11-02T10:00')

  it('pendiente', () => {
    expect(firstResponse('2026-11-02T09:00')).toEqual({
      state: 'pending',
      dueAt,
      remainingSeconds: HOUR,
      overdueSeconds: null,
      tookSeconds: null,
    })
  })

  it('por vencer: quedan 20 min', () => {
    expect(firstResponse('2026-11-02T09:40')).toEqual({
      state: 'warning',
      dueAt,
      remainingSeconds: 20 * MINUTE,
      overdueSeconds: null,
      tookSeconds: null,
    })
    // Justo 30 min antes ya es aviso.
    expect(firstResponse('2026-11-02T09:30').state).toBe('warning')
    expect(firstResponse('2026-11-02T09:29').state).toBe('pending')
  })

  it('vencida', () => {
    expect(firstResponse('2026-11-02T11:00')).toEqual({
      state: 'overdue',
      dueAt,
      remainingSeconds: null,
      overdueSeconds: HOUR,
      tookSeconds: null,
    })
    // En el instante del vencimiento ya está vencida, con 0 s de atraso.
    expect(firstResponse('2026-11-02T10:00')).toMatchObject({ state: 'overdue', overdueSeconds: 0 })
  })

  it('cumplida', () => {
    expect(firstResponse('2026-11-05T12:00', '2026-11-02T09:30')).toEqual({
      state: 'met',
      dueAt,
      remainingSeconds: null,
      overdueSeconds: null,
      tookSeconds: 1.5 * HOUR,
    })
    // Justo en la meta cuenta como cumplida.
    expect(firstResponse('2026-11-05T12:00', '2026-11-02T10:00').state).toBe('met')
  })

  it('incumplida', () => {
    expect(firstResponse('2026-11-05T12:00', '2026-11-02T13:00')).toEqual({
      state: 'missed',
      dueAt,
      remainingSeconds: null,
      overdueSeconds: null,
      tookSeconds: 5 * HOUR,
    })
  })

  it('abierto un viernes a las 16:30: vence el lunes a las 9:30', () => {
    const status = goalStatus({
      start: iso('2026-10-30T16:30'),
      end: null,
      target: SLA_TARGETS.firstResponse,
      now: cr('2026-10-31T12:00'),
    })
    expect(status.dueAt).toBe(cr('2026-11-02T09:30'))
    // El sábado no corre el reloj: sigue faltando 1 h 30.
    expect(status).toMatchObject({ state: 'pending', remainingSeconds: 1.5 * HOUR })
  })
})

describe('goalStatus: resolución (18 h hábiles)', () => {
  const dueAt = cr('2026-11-03T17:00')

  it('pendiente', () => {
    expect(resolution('2026-11-02T12:00')).toEqual({
      state: 'pending',
      dueAt,
      remainingSeconds: 14 * HOUR,
      overdueSeconds: null,
      tookSeconds: null,
    })
  })

  it('por vencer: quedan 20 min', () => {
    expect(resolution('2026-11-03T16:40')).toMatchObject({
      state: 'warning',
      remainingSeconds: 20 * MINUTE,
    })
  })

  it('vencida', () => {
    expect(resolution('2026-11-04T10:00')).toMatchObject({
      state: 'overdue',
      dueAt,
      overdueSeconds: 2 * HOUR,
      remainingSeconds: null,
    })
  })

  it('cumplida', () => {
    expect(resolution('2026-11-06T10:00', '2026-11-03T12:00')).toMatchObject({
      state: 'met',
      tookSeconds: 13 * HOUR,
    })
  })

  it('incumplida', () => {
    expect(resolution('2026-11-06T10:00', '2026-11-04T09:00')).toMatchObject({
      state: 'missed',
      tookSeconds: 19 * HOUR,
    })
  })
})

describe('ticketSla: la meta activa de la columna', () => {
  it('sin primera respuesta: meta de primera respuesta', () => {
    expect(ticketSla(ticket(), cr('2026-11-02T09:00'))).toMatchObject({
      goal: 'firstResponse',
      state: 'pending',
      remainingSeconds: HOUR,
    })
    expect(ticketSla(ticket(), cr('2026-11-02T13:00'))).toMatchObject({
      goal: 'firstResponse',
      state: 'overdue',
      overdueSeconds: 3 * HOUR,
    })
  })

  it('con primera respuesta y sin resolver: meta de resolución', () => {
    const open = ticket({ firstResponseAt: iso('2026-11-02T08:30'), status: 'en_progreso' })
    expect(ticketSla(open, cr('2026-11-02T12:00'))).toMatchObject({
      goal: 'resolution',
      state: 'pending',
      remainingSeconds: 14 * HOUR,
    })
    expect(ticketSla(open, cr('2026-11-03T16:40'))).toMatchObject({
      goal: 'resolution',
      state: 'warning',
    })
    expect(ticketSla(open, cr('2026-11-04T10:00'))).toMatchObject({
      goal: 'resolution',
      state: 'overdue',
      overdueSeconds: 2 * HOUR,
    })
  })

  it('resuelto: meta de resolución cumplida o incumplida', () => {
    const resolvedAt = (local) =>
      ticket({
        firstResponseAt: iso('2026-11-02T08:30'),
        resolvedAt: iso(local),
        status: 'resuelto',
      })
    const now = cr('2026-11-06T10:00')
    expect(ticketSla(resolvedAt('2026-11-03T12:00'), now)).toMatchObject({
      goal: 'resolution',
      state: 'met',
      tookSeconds: 13 * HOUR,
    })
    expect(ticketSla(resolvedAt('2026-11-04T09:00'), now)).toMatchObject({
      goal: 'resolution',
      state: 'missed',
      tookSeconds: 19 * HOUR,
    })
  })

  it('reabierto con resolvedAt viejo: la resolución vuelve a estar pendiente o vencida', () => {
    const reopened = ticket({
      firstResponseAt: iso('2026-11-02T08:30'),
      resolvedAt: iso('2026-11-02T10:00'),
      status: 'abierto',
    })
    expect(ticketSla(reopened, cr('2026-11-02T12:00'))).toMatchObject({
      goal: 'resolution',
      state: 'pending',
      tookSeconds: null,
    })
    expect(ticketSla(reopened, cr('2026-11-04T10:00'))).toMatchObject({
      goal: 'resolution',
      state: 'overdue',
    })
    // Sin primera respuesta, la meta activa sigue siendo la primera respuesta.
    const reopenedNoReply = { ...reopened, firstResponseAt: null }
    expect(ticketSla(reopenedNoReply, cr('2026-11-02T09:00')).goal).toBe('firstResponse')
  })

  it('en "resuelto" sin resolvedAt se trata como no resuelto', () => {
    const odd = ticket({ firstResponseAt: iso('2026-11-02T08:30'), status: 'resuelto' })
    expect(ticketSla(odd, cr('2026-11-02T12:00'))).toMatchObject({
      goal: 'resolution',
      state: 'pending',
    })
  })

  it('abierto un viernes a las 16:30: la primera respuesta vence el lunes a las 9:30', () => {
    const friday = ticket({ openedAt: iso('2026-10-30T16:30') })
    expect(ticketSla(friday, cr('2026-10-30T16:45'))).toMatchObject({
      goal: 'firstResponse',
      state: 'pending',
      dueAt: cr('2026-11-02T09:30'),
      remainingSeconds: 1.75 * HOUR,
    })
  })
})

describe('ticketSlaGoals: las dos metas del detalle', () => {
  it('cada meta con su estado', () => {
    const t = ticket({
      firstResponseAt: iso('2026-11-02T09:30'),
      resolvedAt: iso('2026-11-04T09:00'),
      status: 'resuelto',
    })
    const goals = ticketSlaGoals(t, cr('2026-11-06T10:00'))
    expect(goals.firstResponse).toMatchObject({ state: 'met', tookSeconds: 1.5 * HOUR })
    expect(goals.resolution).toMatchObject({ state: 'missed', tookSeconds: 19 * HOUR })
  })

  it('sin responder ni resolver: ambas pendientes', () => {
    const goals = ticketSlaGoals(ticket(), cr('2026-11-02T09:00'))
    expect(goals.firstResponse).toMatchObject({ state: 'pending', remainingSeconds: HOUR })
    expect(goals.resolution).toMatchObject({ state: 'pending', remainingSeconds: 17 * HOUR })
  })

  it('reabierto: la resolución ignora el resolvedAt viejo', () => {
    const t = ticket({
      firstResponseAt: iso('2026-11-02T08:30'),
      resolvedAt: iso('2026-11-02T10:00'),
      status: 'esperando_cliente',
    })
    const goals = ticketSlaGoals(t, cr('2026-11-04T10:00'))
    expect(goals.firstResponse.state).toBe('met')
    expect(goals.resolution).toMatchObject({ state: 'overdue', overdueSeconds: 2 * HOUR })
  })

  it('resuelto sin primera respuesta (dato raro): la primera respuesta queda vencida', () => {
    const t = ticket({ resolvedAt: iso('2026-11-02T12:00'), status: 'resuelto' })
    const goals = ticketSlaGoals(t, cr('2026-11-02T13:00'))
    expect(goals.firstResponse).toMatchObject({ state: 'overdue', overdueSeconds: 3 * HOUR })
    expect(goals.resolution).toMatchObject({ state: 'met', tookSeconds: 4 * HOUR })
  })
})

describe('slaText', () => {
  const text = (t, now) => slaText(ticketSla(ticket(t), cr(now)))
  const replied = { firstResponseAt: iso('2026-11-02T08:30'), status: 'en_progreso' }

  it('primera respuesta pendiente o por vencer', () => {
    expect(text({}, '2026-11-02T08:40')).toBe('Responder en 1 h 20')
    expect(text({}, '2026-11-02T09:40')).toBe('Responder en 20 min')
  })

  it('menos de un minuto: "menos de 1 min"', () => {
    expect(text({}, '2026-11-02T09:59:15')).toBe('Responder en menos de 1 min')
    expect(text({}, '2026-11-02T10:00:30')).toBe('Respuesta vencida hace menos de 1 min')
  })

  it('primera respuesta vencida', () => {
    expect(text({}, '2026-11-02T13:00')).toBe('Respuesta vencida hace 3 h')
  })

  it('resolución pendiente o por vencer', () => {
    expect(text(replied, '2026-11-02T13:00')).toBe('Resolver en 1 d 4 h')
    expect(text(replied, '2026-11-03T16:40')).toBe('Resolver en 20 min')
  })

  it('resolución vencida', () => {
    expect(text(replied, '2026-11-04T10:00')).toBe('Resolución vencida hace 2 h')
  })

  it('resuelto en plazo o fuera de plazo', () => {
    const resolved = (local) => ({ ...replied, resolvedAt: iso(local), status: 'resuelto' })
    expect(text(resolved('2026-11-03T12:00'), '2026-11-06T10:00')).toBe('En plazo')
    expect(text(resolved('2026-11-04T09:00'), '2026-11-06T10:00')).toBe('Fuera de plazo')
  })

  it('también sirve para una meta de ticketSlaGoals con su goal', () => {
    const goals = ticketSlaGoals(
      ticket({ firstResponseAt: iso('2026-11-02T13:00') }),
      cr('2026-11-02T14:00'),
    )
    expect(slaText({ goal: 'firstResponse', ...goals.firstResponse })).toBe('Fuera de plazo')
  })
})

describe('fechas inválidas', () => {
  const now = cr('2026-11-02T09:00')

  it('apertura vacía o mal formada: estado "unknown" sin fechas ni duraciones', () => {
    for (const start of ['', 'no-es-fecha', null]) {
      expect(goalStatus({ start, end: null, target: SLA_TARGETS.firstResponse, now })).toEqual({
        state: 'unknown',
        dueAt: null,
        remainingSeconds: null,
        overdueSeconds: null,
        tookSeconds: null,
      })
    }
    const sla = ticketSla(ticket({ openedAt: 'mal' }), now)
    expect(sla).toMatchObject({ goal: 'firstResponse', state: 'unknown' })
    expect(slaText(sla)).toBe('—')
  })

  it('cierre mal formado: cuenta como pendiente, no como cumplida', () => {
    const goal = goalStatus({
      start: iso(OPENED),
      end: 'mal',
      target: SLA_TARGETS.firstResponse,
      now,
    })
    expect(goal).toMatchObject({ state: 'pending', remainingSeconds: HOUR })
  })

  it('ticketSla: primera respuesta o resolución inválidas cuentan como si no hubiera', () => {
    expect(ticketSla(ticket({ firstResponseAt: 'mal' }), now)).toMatchObject({
      goal: 'firstResponse',
      state: 'pending',
    })
    const resolvedBadly = ticket({
      firstResponseAt: iso('2026-11-02T08:30'),
      resolvedAt: 'mal',
      status: 'resuelto',
    })
    expect(ticketSla(resolvedBadly, now)).toMatchObject({ goal: 'resolution', state: 'pending' })
  })
})

describe('formatSlaDuration', () => {
  it('duración hábil; menos de un minuto como "menos de 1 min"', () => {
    expect(formatSlaDuration(59)).toBe('menos de 1 min')
    expect(formatSlaDuration(80 * MINUTE)).toBe('1 h 20')
    expect(formatSlaDuration(13 * HOUR)).toBe('1 d 4 h')
  })
})
