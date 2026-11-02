import { describe, expect, it } from 'vitest'

import { businessSeconds } from './business-time'

const HOUR = 3600
// Horas de Costa Rica (UTC−6) escritas con su offset.
const cr = (local) => Date.parse(`${local}-06:00`)
const between = (from, to) => businessSeconds(cr(from), cr(to))

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
})
