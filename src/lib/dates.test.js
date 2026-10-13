import { describe, expect, it } from 'vitest'

import { dayRangeToQuery, formatDuration, startOfLocalDayISO } from './dates'

describe('rango de días para la API (contrato E3)', () => {
  it('"desde" es el inicio de ese día y "hasta" el inicio del día siguiente, en hora local', () => {
    const { from, to } = dayRangeToQuery({ desde: '2026-10-05', hasta: '2026-10-07' })
    expect(from).toBe(new Date(2026, 9, 5).toISOString())
    expect(to).toBe(new Date(2026, 9, 8).toISOString())
  })

  it('cruza fin de mes', () => {
    expect(startOfLocalDayISO('2026-10-31', 1)).toBe(new Date(2026, 10, 1).toISOString())
  })

  it('sin fecha o con texto inválido no manda nada', () => {
    expect(dayRangeToQuery({ desde: '', hasta: undefined })).toEqual({
      from: undefined,
      to: undefined,
    })
    expect(startOfLocalDayISO('05/10/2026')).toBeUndefined()
  })
})

describe('formatDuration', () => {
  const start = '2026-10-10T06:00:00.000Z'
  it.each([
    ['2026-10-10T06:00:35.000Z', '35 s'],
    ['2026-10-10T06:04:12.000Z', '4 min 12 s'],
    ['2026-10-10T07:05:00.000Z', '1 h 05 min'],
  ])('%s → %s', (end, expected) => {
    expect(formatDuration(start, end)).toBe(expected)
  })

  it('sin fin (corrida en curso) → texto vacío', () => {
    expect(formatDuration(start, null, 'En curso')).toBe('En curso')
  })
})
