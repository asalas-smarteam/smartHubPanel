import { describe, expect, it } from 'vitest'

import { codeToInput, parseEmployeeCode, parseSellerCodes, sameCode } from './codes'

describe('códigos del ERP editables (plan 5c)', () => {
  it('vendedor: vacío es null; un entero o varios separados por coma', () => {
    expect(parseSellerCodes('')).toEqual({ value: null, codes: [] })
    expect(parseSellerCodes('   ')).toEqual({ value: null, codes: [] })
    expect(parseSellerCodes(' 53 ')).toEqual({ value: '53', codes: ['53'] })
    expect(parseSellerCodes('113, 758 ,113')).toEqual({ value: '113,758', codes: ['113', '758'] })
    expect(parseSellerCodes('0').value).toBe('0')
  })

  it('vendedor: letras, decimales, negativos o comas sueltas dan error', () => {
    for (const bad of ['abc', '5.3', '-5', '53,', ',53', '53;54', '5 3']) {
      expect(parseSellerCodes(bad).error, bad).toMatch(/solo números/)
    }
    expect(parseSellerCodes(Array.from({ length: 40 }, (_, i) => 1000 + i).join(',')).error).toBe(
      'Son demasiados códigos.',
    )
  })

  it('empleado: vacío es null; solo un entero', () => {
    expect(parseEmployeeCode('')).toEqual({ value: null })
    expect(parseEmployeeCode(' 67 ')).toEqual({ value: '67' })
    for (const bad of ['67,68', 'x', '6.7', '-1']) {
      expect(parseEmployeeCode(bad).error, bad).toMatch(/un solo número/)
    }
  })

  it('valores guardados: texto para el campo y comparación sin importar el tipo', () => {
    expect(codeToInput(53)).toBe('53')
    expect(codeToInput(null)).toBe('')
    expect(sameCode(53, '53')).toBe(true)
    expect(sameCode(null, '')).toBe(true)
    expect(sameCode(0, null)).toBe(false)
    expect(sameCode('53', '54')).toBe(false)
  })
})
