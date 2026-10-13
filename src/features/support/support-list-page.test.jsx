import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email

async function openList(route = '/soporte') {
  const app = renderApp({ route, session: client })
  const table = await screen.findByRole('table', { name: 'Tickets' })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const rows = (table) => within(table).getAllByRole('row').slice(1)

describe('Soporte: lista del cliente', () => {
  it('muestra solo los tickets de su empresa', async () => {
    const { table } = await openList()
    const acme = getDb().tickets.filter((ticket) => ticket.tenantKey === 'ACME')
    expect(screen.getByText(`${acme.length} resultados`)).toBeInTheDocument()
    for (const row of rows(table)) {
      expect(within(row).getAllByRole('cell')[0].textContent).toMatch(/ACME-\d{4}/)
    }
  })

  it('filtrar por estado pide status, vuelve a la página 1 y queda en la URL', async () => {
    const requests = recordRequests('/api/tickets')
    const { user, router } = await openList('/soporte?page=2')
    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Resuelto' }))
    const resolved = getDb().tickets.filter(
      (t) => t.tenantKey === 'ACME' && t.status === 'resuelto',
    )
    await screen.findByText(`${resolved.length} resultados`)
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
      page: '1',
      pageSize: '25',
      status: 'resuelto',
    })
    expect(router.state.location.search).toBe('?status=resuelto')
  })

  it('filtrar por categoría', async () => {
    const requests = recordRequests('/api/tickets')
    const { user } = await openList()
    await user.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await user.click(await screen.findByRole('option', { name: 'Documentos' }))
    await waitFor(() => expect(requests.at(-1).url.searchParams.get('category')).toBe('documentos'))
  })

  it('punto de respuesta nueva que se apaga al abrir el ticket', async () => {
    const { user, table } = await openList()
    const waiting = getDb().tickets.find(
      (t) => t.tenantKey === 'ACME' && t.status === 'esperando_cliente',
    )
    const row = () => within(table).getByText(waiting.title).closest('tr')
    expect(within(row()).getByText('Respuesta nueva')).toBeInTheDocument()

    await user.click(within(row()).getByRole('link', { name: waiting.title }))
    await screen.findByRole('heading', { name: waiting.title })
    await user.click(screen.getByRole('link', { name: 'Volver a Soporte' }))
    const table2 = await screen.findByRole('table', { name: 'Tickets' })
    await waitFor(() =>
      expect(
        within(within(table2).getByText(waiting.title).closest('tr')).queryByText(
          'Respuesta nueva',
        ),
      ).not.toBeInTheDocument(),
    )
  })

  it('sin tickets muestra el vacío con explicación', async () => {
    server.use(
      http.get('/api/tickets', () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 25, total: 0 }),
      ),
    )
    renderApp({ route: '/soporte', session: client })
    expect(await screen.findByText('Todavía no hay tickets')).toBeInTheDocument()
  })

  it('sin tickets.create no hay botón "Nuevo ticket"; sin tickets.read la sección no está', async () => {
    const me = (permissions) =>
      server.use(
        http.get('/api/auth/me', () =>
          HttpResponse.json({
            name: 'Prueba',
            email: 'prueba@acme.test',
            accountType: 'cliente',
            role: 'usuario',
            tenantKey: 'ACME',
            companyName: 'Acme Industrial',
            permissions,
            mustChangePassword: false,
          }),
        ),
      )
    me(['tickets.read'])
    const { unmount } = renderApp({ route: '/soporte', session: client })
    await screen.findByRole('table', { name: 'Tickets' })
    expect(screen.queryByRole('link', { name: 'Nuevo ticket' })).not.toBeInTheDocument()
    unmount()

    me(['events.read'])
    renderApp({ route: '/soporte', session: client })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Soporte' })).not.toBeInTheDocument()
  })
})
