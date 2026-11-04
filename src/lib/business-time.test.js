import { describe, expect, it } from 'vitest'

import { addBusinessSeconds, businessSeconds } from './business-time'

const HOUR = 3600
// Horas de Costa Rica (UTC−6) escritas con su offset.
const cr = (local) => Date.parse(`${local}-06:00`)
const between = (from, to) => businessSeconds(cr(from), cr(to))
const add = (from, seconds) => addBusinessSeconds(cr(from), seconds)

describe('businessSeconds (lunes a viernes, 8:00 a 17:00, hora de Costa Rica)', () => {
  it('mismo día, dentro y fuera de horario', () => {
    expect(between('2026-10-28T09:00', '2026-10-28T11:30')).toBe(2.5 * HOUR)
    expect(between('2026-10-28T06:00', '2026-10-28T19:00')).toBe(9 * HOUR)
    expect(between('2026-10-28T18:00', '2026-10-28T22:00')).toBe(0)
  })

  it('cruza la noche y el fin de semana', () => {
    // Viernes 16:00 → lunes 9:00: 1 h del viernes + 1 h del lunes.
    expect(between('2026-10-30T16:00', '2026-11-02T09:00')).toBe(2 * HOUR)
    // Abierto el sábado: empieza a contar el lunes a las 8:00.
    expect(between('2026-10-31T10:00', '2026-11-02T10:00')).toBe(2 * HOUR)
    expect(between('2026-10-31T08:00', '2026-11-01T18:00')).toBe(0)
    // Martes 17:30 → miércoles 8:30.
    expect(between('2026-10-27T17:30', '2026-10-28T08:30')).toBe(0.5 * HOUR)
  })

  it('varios días hábiles', () => {
    // Lunes 8:00 → viernes 17:00: 5 días de 9 h.
    expect(between('2026-10-26T08:00', '2026-10-30T17:00')).toBe(45 * HOUR)
    // Jueves 9:00 → martes 13:00, con un fin de semana en medio.
    expect(between('2026-10-29T09:00', '2026-11-03T13:00')).toBe((8 + 9 + 9 + 5) * HOUR)
  })

  it('fechas iguales o invertidas: 0', () => {
    expect(between('2026-10-28T10:00', '2026-10-28T10:00')).toBe(0)
    expect(between('2026-10-28T12:00', '2026-10-28T10:00')).toBe(0)
  })

  it('con instantes no finitos devuelve 0 (sin recorrer días)', () => {
    const from = cr('2026-10-28T09:00')
    expect(businessSeconds(from, Infinity)).toBe(0)
    expect(businessSeconds(-Infinity, from)).toBe(0)
    expect(businessSeconds(NaN, from)).toBe(0)
    expect(businessSeconds(from, NaN)).toBe(0)
  })
})

describe('addBusinessSeconds (plazo en horario hábil)', () => {
  it('dentro del mismo día', () => {
    // Miércoles 9:00 + 2 h → miércoles 11:00.
    expect(add('2026-10-28T09:00', 2 * HOUR)).toBe(cr('2026-10-28T11:00'))
  })

  it('cruza el fin de semana', () => {
    // Viernes 16:30 + 2 h → lunes 9:30 (30 min del viernes + 1 h 30 del lunes).
    expect(add('2026-10-30T16:30', 2 * HOUR)).toBe(cr('2026-11-02T09:30'))
  })

  it('arranca en la próxima apertura si empieza fuera de horario', () => {
    // Sábado 10:00 + 2 h → lunes 10:00.
    expect(add('2026-10-31T10:00', 2 * HOUR)).toBe(cr('2026-11-02T10:00'))
    // Martes 18:00 + 30 min → miércoles 8:30.
    expect(add('2026-10-27T18:00', 0.5 * HOUR)).toBe(cr('2026-10-28T08:30'))
    // Miércoles 6:00 + 1 h → miércoles 9:00.
    expect(add('2026-10-28T06:00', HOUR)).toBe(cr('2026-10-28T09:00'))
    // Miércoles 17:00 en punto ya está cerrado: + 1 h → jueves 9:00.
    expect(add('2026-10-28T17:00', HOUR)).toBe(cr('2026-10-29T09:00'))
  })

  it('varios días hábiles', () => {
    // Martes 16:00 + 18 h → jueves 16:00 (1 h mar + 9 h mié + 8 h jue).
    expect(add('2026-10-27T16:00', 18 * HOUR)).toBe(cr('2026-10-29T16:00'))
    // Jueves 9:00 + 31 h → martes 13:00, con un fin de semana en medio.
    expect(add('2026-10-29T09:00', 31 * HOUR)).toBe(cr('2026-11-03T13:00'))
  })

  it('si vence justo al cierre devuelve las 17:00, no la apertura siguiente', () => {
    // Miércoles 15:00 + 2 h → miércoles 17:00.
    expect(add('2026-10-28T15:00', 2 * HOUR)).toBe(cr('2026-10-28T17:00'))
    // Viernes 8:00 + 9 h → viernes 17:00 (no el lunes).
    expect(add('2026-10-30T08:00', 9 * HOUR)).toBe(cr('2026-10-30T17:00'))
  })

  it('con 0 o negativo: el mismo instante si está en horario; si no, la próxima apertura', () => {
    expect(add('2026-10-28T10:00', 0)).toBe(cr('2026-10-28T10:00'))
    expect(add('2026-10-28T10:00', -HOUR)).toBe(cr('2026-10-28T10:00'))
    expect(add('2026-10-31T10:00', 0)).toBe(cr('2026-11-02T08:00'))
    expect(add('2026-10-28T17:00', 0)).toBe(cr('2026-10-29T08:00'))
    expect(add('2026-10-28T07:00', 0)).toBe(cr('2026-10-28T08:00'))
  })

  it('valores no finitos: NaN', () => {
    expect(addBusinessSeconds(Number.NaN, HOUR)).toBeNaN()
    expect(add('2026-10-28T10:00', Number.POSITIVE_INFINITY)).toBeNaN()
  })

  it('es la inversa de businessSeconds', () => {
    const starts = [
      '2026-10-28T09:00',
      '2026-10-30T16:30',
      '2026-10-31T10:00',
      '2026-10-27T18:00',
      '2026-10-28T17:00',
      '2026-10-29T12:34',
    ]
    const amounts = [1, 59, 30 * 60, 2 * HOUR, 9 * HOUR, 18 * HOUR, 50 * HOUR]
    for (const start of starts) {
      for (const seconds of amounts) {
        expect(businessSeconds(cr(start), add(start, seconds))).toBe(seconds)
      }
    }
  })
})
