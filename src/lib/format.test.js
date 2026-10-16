import { describe, expect, it } from 'vitest'

import { formatMilliseconds, formatNumber, formatPercent, formatSeconds, ratio } from './format'

const NBSP = ' '

describe('formatNumber', () => {
  it('separa miles con punto y decimales con coma, también con 4 cifras', () => {
    expect(formatNumber(1234)).toBe('1.234')
    expect(formatNumber(12345.5)).toBe('12.345,5')
    expect(formatNumber(0)).toBe('0')
  })

  it('redondea a 1 decimal por defecto', () => {
    expect(formatNumber(3.14159)).toBe('3,1')
  })

  it('sin número muestra el texto vacío', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined, '')).toBe('')
    expect(formatNumber(Number.NaN)).toBe('—')
  })
})

describe('ratio y formatPercent', () => {
  it('ratio es la parte sobre el total; sin total es null', () => {
    expect(ratio(412, 471)).toBeCloseTo(0.8747, 4)
    expect(ratio(3, 0)).toBeNull()
    expect(ratio(null, 10)).toBeNull()
  })

  it('porcentaje con coma decimal y espacio duro antes de %', () => {
    expect(formatPercent(412, 471)).toBe(`87,5${NBSP}%`)
    expect(formatPercent(43, 64, 0)).toBe(`67${NBSP}%`)
    expect(formatPercent(5, 5)).toBe(`100${NBSP}%`)
  })

  it('sin total no inventa un 0 %', () => {
    expect(formatPercent(0, 0)).toBe('—')
  })
})

describe('formatSeconds (duraciones de tableros)', () => {
  it.each([
    [35, '35 s'],
    [59, '59 s'],
    [60, '1 min'],
    [52 * 60 + 20, '52 min'],
    [3600, '1 h'],
    [80 * 60, '1 h 20'],
    [9 * 3600 + 40 * 60, '9 h 40'],
    [9 * 3600 + 5 * 60, '9 h 05'],
    [86400, '1 d'],
    [3 * 86400 + 4 * 3600, '3 d 4 h'],
  ])('%i s → %s', (seconds, text) => {
    expect(formatSeconds(seconds)).toBe(text)
  })

  it('compacta a la unidad mayor, redondeando (rótulos de columnas)', () => {
    expect(formatSeconds(11 * 3600 + 20 * 60, { compact: true })).toBe('11 h')
    expect(formatSeconds(11 * 3600 + 40 * 60, { compact: true })).toBe('12 h')
    expect(formatSeconds(45 * 60, { compact: true })).toBe('45 min')
    expect(formatSeconds(2.6 * 86400, { compact: true })).toBe('3 d')
    expect(formatSeconds(20, { compact: true })).toBe('20 s')
  })

  it('sin dato o negativo muestra el texto vacío', () => {
    expect(formatSeconds(null)).toBe('—')
    expect(formatSeconds(-5)).toBe('—')
    expect(formatSeconds(undefined, { empty: 'sin datos' })).toBe('sin datos')
  })
})

describe('formatMilliseconds (promedios de duración)', () => {
  it.each([
    [0, '0 ms'],
    [849.6, '850 ms'],
    [1000, '1 s'],
    [4240, '4,2 s'],
    [9960, '10 s'],
    [46_400, '46 s'],
    [200_000, '3 min 20 s'],
    [3_900_000, '1 h 05 min'],
  ])('%s ms → %s', (ms, expected) => {
    expect(formatMilliseconds(ms)).toBe(expected)
  })

  it('sin valor o negativo: el texto vacío', () => {
    expect(formatMilliseconds(null)).toBe('—')
    expect(formatMilliseconds(-1)).toBe('—')
    expect(formatMilliseconds(Number.NaN, 'n/d')).toBe('n/d')
  })
})
