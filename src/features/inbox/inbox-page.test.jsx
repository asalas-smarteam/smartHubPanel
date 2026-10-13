import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { setFailingTenants } from '@/mocks/tickets-db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const staff = DEMO_ACCOUNTS.smarteam.email
const count = (predicate) => getDb().tickets.filter(predicate).length

async function openInbox(route = '/bandeja') {
  const app = renderApp({ route, session: staff })
  const table = await screen.findByRole('table', { name: 'Bandeja' })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

describe('Bandeja de Smarteam', () => {
  it('muestra los tickets de todas las empresas y los contadores por estado', async () => {
    const { table } = await openInbox()
    expect(screen.getByText(`${getDb().tickets.length} resultados`)).toBeInTheDocument()
    const companies = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[1].textContent)
    expect(new Set(companies).size).toBeGreaterThan(1)

    const counters = screen.getByRole('group', { name: 'Tickets por estado' })
    await waitFor(() =>
      expect(within(counters).getByRole('button', { name: /^Resuelto/ })).toHaveTextContent(
        String(count((t) => t.status === 'resuelto')),
      ),
    )
  })

  it('hacer clic en un contador filtra por ese estado; otro clic lo quita', async () => {
    const requests = recordRequests('/api/staff/tickets')
    const { user, router } = await openInbox()
    const counters = screen.getByRole('group', { name: 'Tickets por estado' })
    const waiting = within(counters).getByRole('button', { name: /^Esperando cliente/ })

    await user.click(waiting)
    await screen.findByText(`${count((t) => t.status === 'esperando_cliente')} resultados`)
    expect(waiting).toHaveAttribute('aria-pressed', 'true')
    expect(requests.at(-1).url.searchParams.get('status')).toBe('esperando_cliente')
    expect(router.state.location.search).toBe('?status=esperando_cliente')

    await user.click(waiting)
    await screen.findByText(`${getDb().tickets.length} resultados`)
    expect(router.state.location.search).toBe('')
  })

  it('filtros por empresa y categoría', async () => {
    const requests = recordRequests('/api/staff/tickets')
    const { user } = await openInbox()
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Globex Comercial' }))
    await screen.findByText(`${count((t) => t.tenantKey === 'GLOBEX')} resultados`)

    await user.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await user.click(await screen.findByRole('option', { name: 'Precios' }))
    await waitFor(() =>
      expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
        page: '1',
        pageSize: '25',
        tenantKey: 'GLOBEX',
        category: 'precios',
      }),
    )
  })

  it('si una empresa falla, avisa y muestra el resto', async () => {
    setFailingTenants(['GLOBEX'])
    await openInbox()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar los tickets de: Globex Comercial',
    )
    expect(
      screen.getByText(`${count((t) => t.tenantKey !== 'GLOBEX')} resultados`),
    ).toBeInTheDocument()
  })

  it('más allá de 1000 tickets pide filtrar', async () => {
    renderApp({ route: '/bandeja?page=11&pageSize=100', session: staff })
    expect(await screen.findByText(/Para ver tickets más antiguos, filtra/)).toBeInTheDocument()
  })

  it('marca con un punto los tickets con mensaje nuevo del cliente', async () => {
    const { table } = await openInbox('/bandeja?pageSize=50')
    const untouched = getDb().tickets.find((t) => t.status === 'abierto' && !t.staffLastSeenAt)
    const row = within(table).getByText(untouched.code).closest('tr')
    expect(within(row).getByText('Mensaje nuevo del cliente')).toBeInTheDocument()
  })

  it('una cuenta cliente no ve la Bandeja', async () => {
    renderApp({ route: '/bandeja', session: DEMO_ACCOUNTS.clienteUsuario.email })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bandeja' })).not.toBeInTheDocument()
  })

  it('error de la API → estado de error', async () => {
    server.use(http.get('/api/staff/tickets', () => new HttpResponse(null, { status: 500 })))
    renderApp({ route: '/bandeja', session: staff })
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
