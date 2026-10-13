import { describe, expect, it } from 'vitest'

import { permissionsFor } from '@/mocks/permissions'

import { visibleNavItems } from './nav'

const labelsFor = (accountType) => {
  const permissions = permissionsFor({ accountType })
  return visibleNavItems((permission) => permissions.includes(permission)).map((i) => i.label)
}

describe('menú por permisos', () => {
  it('cliente: Soporte, Eventos y Syncs', () => {
    expect(labelsFor('cliente')).toEqual(['Soporte', 'Eventos', 'Syncs'])
  })

  it('Smarteam: Bandeja, Eventos, Syncs y Usuarios', () => {
    expect(labelsFor('smarteam')).toEqual(['Bandeja', 'Eventos', 'Syncs', 'Usuarios'])
  })

  it('sin events.read ni syncs.read no aparecen', () => {
    expect(
      visibleNavItems((permission) => permission === 'tickets.read').map((i) => i.label),
    ).toEqual(['Soporte'])
  })
})
