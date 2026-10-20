import { describe, expect, it } from 'vitest'

import { can } from '@/features/auth/permissions'
import { permissionsFor } from '@/mocks/permissions'

import { visibleNavItems } from './nav'

const labelsFor = (accountType) => {
  const permissions = permissionsFor({ accountType })
  return visibleNavItems((permission) => can(permissions, permission)).map((i) => i.label)
}

describe('menú por permisos', () => {
  it('cliente: Inicio (su primera sección), Soporte, Eventos, Syncs, Tareas programadas y Mapeo de campos (Métricas, solo Smarteam)', () => {
    expect(labelsFor('cliente')).toEqual([
      'Inicio',
      'Soporte',
      'Eventos',
      'Syncs',
      'Tareas programadas',
      'Mapeo de campos',
    ])
  })

  it('Smarteam: Bandeja (su primera sección), Inicio, Métricas, Eventos, Syncs, Tareas programadas, Mapeo de campos y Usuarios', () => {
    expect(labelsFor('smarteam')).toEqual([
      'Bandeja',
      'Inicio',
      'Métricas',
      'Eventos',
      'Syncs',
      'Tareas programadas',
      'Mapeo de campos',
      'Usuarios',
    ])
  })

  it('sin events.read ni syncs.read no aparecen', () => {
    expect(
      visibleNavItems((permission) => can(['tickets.read'], permission)).map((i) => i.label),
    ).toEqual(['Soporte'])
  })
})
