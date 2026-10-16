import { describe, expect, it } from 'vitest'

import { addDays, eachLocalDay, localDate, median, mondayOf, readPeriod } from './period'

const query = (params) => new URLSearchParams(params)

describe('períodos de los resúmenes (F4, F9)', () => {
  it('día local según la zona: las 3:00 UTC del 6 son el 5 en Costa Rica', () => {
    expect(localDate(Date.parse('2026-10-06T03:00:00Z'), 'America/Costa_Rica')).toBe('2026-10-05')
    expect(localDate(Date.parse('2026-10-06T03:00:00Z'), 'UTC')).toBe('2026-10-06')
  })

  it('todos los días del período, con `to` exclusivo', () => {
    const from = Date.parse('2026-09-29T06:00:00Z') // 29-09 00:00 en Costa Rica
    const to = Date.parse('2026-10-02T06:00:00Z') // 02-10 00:00 → el último día es el 01-10
    expect(eachLocalDay(from, to, 'America/Costa_Rica')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ])
  })

  it('suma días y encuentra el lunes de la semana', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(mondayOf('2026-10-11')).toBe('2026-10-05') // domingo → lunes anterior
    expect(mondayOf('2026-10-05')).toBe('2026-10-05')
  })

  it('mediana redondeada; null sin datos', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 10])).toBe(3) // (2 + 3) / 2 = 2,5 → 3
    expect(median([])).toBeNull()
  })

  describe('readPeriod', () => {
    const ok = {
      from: '2026-09-12T06:00:00.000Z',
      to: '2026-10-12T06:00:00.000Z',
      tz: 'America/Costa_Rica',
    }

    it('devuelve el período en ms con su zona', () => {
      expect(readPeriod(query(ok))).toEqual({
        from: Date.parse(ok.from),
        to: Date.parse(ok.to),
        tz: 'America/Costa_Rica',
      })
    })

    it.each([
      ['sin zona', { ...ok, tz: '' }],
      ['zona inválida', { ...ok, tz: 'Marte/Olimpo' }],
      ['sin desde', { ...ok, from: '' }],
      ['fecha inválida', { ...ok, to: 'mañana' }],
      ['hasta antes que desde', { ...ok, from: ok.to, to: ok.from }],
      ['más de 366 días', { ...ok, from: '2025-01-01T06:00:00.000Z' }],
    ])('%s → null', (_, params) => {
      expect(readPeriod(query(params))).toBeNull()
    })
  })
})
