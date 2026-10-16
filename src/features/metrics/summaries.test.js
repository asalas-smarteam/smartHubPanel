import { describe, expect, it } from 'vitest'

import { bucketSentence, categorySentence, comparisonNote, monthRows } from './summaries'

const week = (weekStart, resolved, reopened = 0) => ({
  weekStart,
  resolved,
  reopened,
  medianResolutionSeconds: 3600,
})

describe('métricas: resúmenes', () => {
  it('agrupa las semanas por el mes de su lunes y suma resueltos y reabiertos', () => {
    expect(
      monthRows([
        week('2026-08-24', 2, 1),
        week('2026-08-31', 3),
        week('2026-09-07', 4, 1),
        week('2026-09-28', 1),
      ]),
    ).toEqual([
      { key: '2026-08', label: 'ago 26', resolved: 5, reopened: 1 },
      { key: '2026-09', label: 'sep 26', resolved: 5, reopened: 1 },
    ])
  })

  it('compara con el período anterior', () => {
    expect(comparisonNote(64, 52, '90 días')).toBe('12 más que los 90 días anteriores')
    expect(comparisonNote(3, 5, '12 meses')).toBe('2 menos que los 12 meses anteriores')
    expect(comparisonNote(4, 4, '30 días')).toBe('igual que los 30 días anteriores')
  })

  it('frase de rangos: cuántos en menos de un día', () => {
    const buckets = [
      { key: 'lt4h', count: 18 },
      { key: '4h_24h', count: 25 },
      { key: '1d_3d', count: 15 },
      { key: 'gt3d', count: 6 },
    ]
    expect(bucketSentence(buckets)).toBe('43 de 64 (67 %) se resolvieron en menos de un día.')
    expect(bucketSentence(buckets.map((b) => ({ ...b, count: 0 })))).toBeNull()
  })

  it('frase de categorías: la más lenta', () => {
    const entry = (category, resolved, median) => ({
      category,
      resolved,
      medianResolutionSeconds: median,
    })
    expect(
      categorySentence([entry('documentos', 22, 21600), entry('sincronizacion', 17, 68400)]),
    ).toBe('Sincronización es la más lenta de resolver (mediana 19 h).')
    expect(categorySentence([entry('precios', 9, 90000), entry('acceso', 5, 3600)])).toBe(
      'Precios es la de más volumen y la más lenta de resolver (mediana 1 d 1 h).',
    )
    expect(categorySentence([entry('otro', 3, 3600)])).toBeNull()
    expect(categorySentence([entry('otro', 3, 3600), entry('acceso', 1, null)])).toBeNull()
  })
})
