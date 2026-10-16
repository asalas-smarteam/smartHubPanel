import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/query-client'

import { Can } from './can'
import { can, PERMISSIONS } from './permissions'
import { SESSION_QUERY_KEY } from './session'

function renderWithPermissions(ui, permissions) {
  const queryClient = createQueryClient({ retry: false })
  queryClient.setQueryData(SESSION_QUERY_KEY, {
    status: 'authenticated',
    user: { name: 'X', permissions },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('can()', () => {
  it('true solo si el permiso está en la lista', () => {
    expect(can(['staff.users'], PERMISSIONS.STAFF_USERS)).toBe(true)
    expect(can(['tickets.read'], PERMISSIONS.STAFF_USERS)).toBe(false)
  })

  it('un permiso que el front no conoce nunca habilita nada', () => {
    expect(can(['algo.nuevo'], 'algo.nuevo')).toBe(false)
  })

  it('con una lista basta tener cualquiera de ellos (p. ej. Métricas)', () => {
    const metrics = [PERMISSIONS.TICKETS_READ, PERMISSIONS.STAFF_TICKETS]
    expect(can(['tickets.read'], metrics)).toBe(true)
    expect(can(['staff.tickets'], metrics)).toBe(true)
    expect(can(['events.read'], metrics)).toBe(false)
    expect(can(['tickets.read'], [])).toBe(false)
  })
})

describe('<Can>', () => {
  it('muestra el contenido con el permiso y el fallback sin él', () => {
    const ui = (
      <Can permission={PERMISSIONS.STAFF_USERS} fallback={<span>sin permiso</span>}>
        <button type="button">Nuevo usuario</button>
      </Can>
    )
    const { unmount } = renderWithPermissions(ui, ['staff.users'])
    expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument()
    unmount()

    renderWithPermissions(ui, ['tickets.read', 'algo.desconocido'])
    expect(screen.queryByRole('button', { name: 'Nuevo usuario' })).not.toBeInTheDocument()
    expect(screen.getByText('sin permiso')).toBeInTheDocument()
  })
})
