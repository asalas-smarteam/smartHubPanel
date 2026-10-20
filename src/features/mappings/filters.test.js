import { describe, expect, it } from 'vitest'

import { contextLabel, objectLabel } from './constants'
import { filterMappings, optionsFrom, sortMappings, summarize } from './filters'

const item = (fields) => ({
  id: fields.sourceField ?? 'x',
  sourceField: null,
  targetField: null,
  objectType: 'product',
  sourceContext: 'product',
  isActive: true,
  editable: true,
  includeInSourceQuery: true,
  userField: false,
  ...fields,
})

const items = [
  item({ sourceField: 'ItemCode', targetField: 'item_code' }),
  item({
    sourceField: 'CardName',
    targetField: 'name',
    objectType: 'company',
    sourceContext: 'businessPartner',
  }),
  item({
    sourceField: 'Phone1',
    targetField: 'phone',
    objectType: 'company',
    sourceContext: 'businessPartner',
    isActive: false,
    editable: false,
  }),
]

describe('mapeo de campos: filtros', () => {
  it('por objeto, contexto y estado', () => {
    expect(filterMappings(items, { objeto: 'company' }).map((i) => i.sourceField)).toEqual([
      'CardName',
      'Phone1',
    ])
    expect(filterMappings(items, { contexto: 'product' })).toHaveLength(1)
    expect(filterMappings(items, { estado: 'activos' })).toHaveLength(2)
    expect(filterMappings(items, { estado: 'inactivos' }).map((i) => i.sourceField)).toEqual([
      'Phone1',
    ])
  })

  it('la búsqueda mira el campo del ERP y la propiedad del CRM, sin distinguir mayúsculas', () => {
    expect(filterMappings(items, { q: 'PHONE' }).map((i) => i.sourceField)).toEqual(['Phone1'])
    expect(filterMappings(items, { q: 'item_' }).map((i) => i.sourceField)).toEqual(['ItemCode'])
    expect(filterMappings([item({ sourceField: null, targetField: null })], { q: 'a' })).toEqual([])
  })

  it('ordena por objeto, contexto y campo (en español)', () => {
    expect(sortMappings(items).map((i) => i.sourceField)).toEqual([
      'CardName',
      'Phone1',
      'ItemCode',
    ])
  })

  it('opciones con los valores presentes; un valor desconocido se ve tal cual', () => {
    const withUnknown = [...items, item({ sourceContext: 'creditNotes' })]
    expect(optionsFrom(withUnknown, 'sourceContext', contextLabel)).toEqual([
      { value: 'creditNotes', label: 'creditNotes' },
      { value: 'product', label: 'Producto' },
      { value: 'businessPartner', label: 'Socio de negocio' },
    ])
    expect(objectLabel(null)).toBe('—')
  })

  it('resumen: total, activos, inactivos y editables', () => {
    expect(summarize(items)).toEqual({ total: 3, active: 2, inactive: 1, editable: 2 })
  })
})
