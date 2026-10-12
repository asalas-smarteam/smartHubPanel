import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const staff = DEMO_ACCOUNTS.smarteam.email

async function openUsers(route = '/usuarios') {
  const app = renderApp({ route, session: staff })
  await screen.findByRole('heading', { name: 'Usuarios' })
  const table = await screen.findByRole('table', { name: 'Usuarios' })
  await screen.findByText(/\d+ resultados/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)

describe('Usuarios: paginación del servidor', () => {
  it('primera página: 25 filas, total y "Página 1 de 2"', async () => {
    const requests = recordRequests('/api/staff/users')
    const { table } = await openUsers()
    expect(bodyRows(table)).toHaveLength(25)
    expect(screen.getByText(`${getDb().users.length} resultados`)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
      page: '1',
      pageSize: '25',
    })
  })

  it('"Siguiente" pide page=2, muestra otras filas y actualiza la URL', async () => {
    const requests = recordRequests('/api/staff/users')
    const { user, router, table } = await openUsers()
    const firstName = within(bodyRows(table)[0]).getAllByRole('cell')[0].textContent

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await screen.findByText('Página 2 de 2')
    await waitFor(() => expect(bodyRows(table)).toHaveLength(getDb().users.length - 25))
    expect(within(bodyRows(table)[0]).getAllByRole('cell')[0].textContent).not.toBe(firstName)
    expect(requests.at(-1).url.searchParams.get('page')).toBe('2')
    expect(router.state.location.search).toBe('?page=2')
  })

  it('abrir /usuarios?page=2 muestra la página 2', async () => {
    await openUsers('/usuarios?page=2')
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
  })

  it('cambiar a 50 filas pide pageSize=50 y vuelve a la página 1', async () => {
    const requests = recordRequests('/api/staff/users')
    const { user, router } = await openUsers('/usuarios?page=2')
    await user.click(screen.getByRole('combobox', { name: 'Filas por página' }))
    await user.click(await screen.findByRole('option', { name: '50' }))
    await screen.findByText('Página 1 de 1')
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
      page: '1',
      pageSize: '50',
    })
    expect(router.state.location.search).toBe('?pageSize=50')
  })

  it('filtrar por empresa pide tenantKey, vuelve a la página 1 y cambia el total', async () => {
    const requests = recordRequests('/api/staff/users')
    const { user, router } = await openUsers('/usuarios?page=2')
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Acme Industrial' }))

    const acmeTotal = getDb().users.filter((u) => u.tenantKey === 'ACME').length
    await screen.findByText(`${acmeTotal} resultados`)
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
      page: '1',
      pageSize: '25',
      tenantKey: 'ACME',
    })
    expect(router.state.location.search).toBe('?tenantKey=ACME')
  })

  it('lista vacía → estado vacío', async () => {
    server.use(
      http.get('/api/staff/users', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 25, total: 0 }),
      ),
    )
    renderApp({ route: '/usuarios', session: staff })
    expect(await screen.findByText('No hay usuarios')).toBeInTheDocument()
  })

  it('error 500 → estado de error y "Reintentar" vuelve a pedir', async () => {
    let calls = 0
    server.use(
      http.get('/api/staff/users', () => {
        calls += 1
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const { user } = renderApp({ route: '/usuarios', session: staff })
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(calls).toBe(2))
  })

  it('respuesta con forma inválida → estado de error', async () => {
    server.use(http.get('/api/staff/users', () => HttpResponse.json({ items: 'nope' })))
    const original = console.error
    console.error = () => {}
    try {
      renderApp({ route: '/usuarios', session: staff })
      expect(await screen.findByText(/respondió algo inesperado/)).toBeInTheDocument()
    } finally {
      console.error = original
    }
  })
})

describe('Usuarios: visibilidad por permiso', () => {
  function meWith(overrides) {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          name: 'Persona de prueba',
          email: 'prueba@panel.test',
          accountType: 'cliente',
          role: 'admin',
          tenantKey: 'ACME',
          companyName: 'Acme Industrial',
          permissions: [],
          mustChangePassword: false,
          ...overrides,
        }),
      ),
    )
  }

  it('con staff.users: menú "Usuarios" y botón "Nuevo usuario"', async () => {
    renderApp({ route: '/usuarios', session: staff })
    expect(await screen.findByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Menú principal' })[0]
    expect(within(nav).getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
  })

  it.each(['admin', 'usuario'])(
    'cliente %s (sin staff.users): sin menú y "No tienes acceso" sin pedir la lista',
    async (role) => {
      const requests = recordRequests('/api/staff/users')
      meWith({ role, permissions: ['tickets.read', 'tickets.create', 'events.read', 'syncs.read'] })
      renderApp({ route: '/usuarios' })
      expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Nuevo usuario' })).not.toBeInTheDocument()
      expect(requests).toHaveLength(0)
    },
  )

  it('decide por permiso, no por tipo de cuenta: cliente con staff.users sí lo ve', async () => {
    meWith({ accountType: 'cliente', permissions: ['staff.users'] })
    signInStaffForApi()
    renderApp({ route: '/usuarios' })
    expect(await screen.findByRole('button', { name: 'Nuevo usuario' })).toBeInTheDocument()
  })

  it('…y una cuenta smarteam sin staff.users no lo ve', async () => {
    meWith({
      accountType: 'smarteam',
      role: null,
      tenantKey: null,
      companyName: null,
      permissions: ['events.read'],
    })
    renderApp({ route: '/usuarios' })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
  })

  it('acciones por fila: ninguna en la fila propia; "Cambiar rol" solo en clientes', async () => {
    // Con 50 filas por página entran todos los usuarios del seed.
    const { user, table } = await openUsers('/usuarios?pageSize=50')
    const ownRow = within(table).getByText('Equipo Smarteam').closest('tr')
    expect(within(ownRow).queryByRole('button')).not.toBeInTheDocument()

    await user.click(within(table).getByRole('button', { name: 'Acciones para Mario Quesada' }))
    expect(await screen.findByRole('menuitem', { name: 'Cambiar rol' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Desactivar' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    const otherStaff = getDb().users.find(
      (u) => u.accountType === 'smarteam' && u.id !== 'u-staff-1' && u.active,
    )
    await user.click(
      within(table).getByRole('button', { name: `Acciones para ${otherStaff.name}` }),
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Restablecer contraseña' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Cambiar rol' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    const inactive = getDb().users.find((u) => !u.active)
    await user.click(within(table).getByRole('button', { name: `Acciones para ${inactive.name}` }))
    expect(await screen.findByRole('menuitem', { name: 'Reactivar' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Desactivar' })).not.toBeInTheDocument()
  })
})

/** La lista la sirve el mock con la sesión de Smarteam (el /me sobreescrito no cambia la API). */
function signInStaffForApi() {
  return import('@/mocks/db').then(({ signInAs }) => signInAs(staff))
}
