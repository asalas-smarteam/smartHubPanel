import { describe, expect, it } from 'vitest'

import { filterOwners, sortOwners, summarizeOwners } from './filters'

const owner = (id, extra = {}) => ({
  id,
  crmOwnerId: `1${id}`,
  crmOwnerName: null,
  crmOwnerEmail: null,
  erpOwnerId: null,
  erpOwnerName: null,
  erpEmployeeId: null,
  active: true,
  ...extra,
})

const items = [
  owner('a', { crmOwnerName: 'Zoe', erpOwnerId: 53, erpEmployeeId: 67 }),
  owner('b', { crmOwnerName: 'ana', crmOwnerEmail: 'ana@x.example' }),
  owner('c', { crmOwnerEmail: 'bruno@x.example', erpOwnerId: 0 }),
  owner('d', { crmOwnerName: 'Ángel', erpOwnerId: 9, active: false }),
]

describe('responsables: orden, filtros y resumen', () => {
  it('activos primero, después por nombre (o correo) sin distinguir acentos ni mayúsculas', () => {
    expect(sortOwners(items).map((o) => o.id)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('filtra por estado y busca en nombre, correo e IDs del CRM y del ERP', () => {
    expect(filterOwners(items, { estado: 'inactivos' }).map((o) => o.id)).toEqual(['d'])
    expect(filterOwners(items, { estado: 'activos' })).toHaveLength(3)
    expect(filterOwners(items, { q: 'ANA@' }).map((o) => o.id)).toEqual(['b'])
    expect(filterOwners(items, { q: '67' }).map((o) => o.id)).toEqual(['a'])
    expect(filterOwners(items, { q: '1c' }).map((o) => o.id)).toEqual(['c'])
    expect(filterOwners(items, { q: '  ' })).toHaveLength(4)
  })

  it('"sin vendedor" cuenta los activos sin código del ERP (0 sí es un código)', () => {
    expect(summarizeOwners(items)).toEqual({ total: 4, active: 3, withoutSeller: 1 })
  })
})
