import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

  describe('SLA', () => {
    // Miércoles 4 de noviembre, 10:00 en Costa Rica (UTC−6). Solo se simula Date.
    const NOW = Date.parse('2026-11-04T16:00:00.000Z')
    afterEach(() => {
      vi.useRealTimers()
    })

    it('columna "SLA" después de "Estado" y la fila vencida marcada en rojo', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(NOW)
      const [late, onTime] = getDb().tickets.filter((t) => t.status === 'abierto')
      // Sin respuesta desde el martes a las 10:00: la respuesta venció hace 7 h hábiles.
      Object.assign(late, {
        openedAt: '2026-11-03T16:00:00.000Z',
        firstResponseAt: null,
        lastActivityAt: '2026-11-04T15:59:00.000Z',
      })
      // Abierto hace una hora: falta 1 h para responder.
      Object.assign(onTime, {
        openedAt: '2026-11-04T15:00:00.000Z',
        firstResponseAt: null,
        lastActivityAt: '2026-11-04T15:58:00.000Z',
      })

      const { table } = await openInbox()
      const headers = within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
      expect(headers.slice(headers.indexOf('Estado'), headers.indexOf('Estado') + 2)).toEqual([
        'Estado',
        'SLA',
      ])

      const lateRow = within(table).getByText(late.code).closest('tr')
      expect(lateRow).toHaveAttribute('data-sla', 'overdue')
      expect(lateRow).toHaveClass('bg-status-error-bg/40')
      expect(within(lateRow).getByText('Respuesta vencida hace 7 h')).toBeInTheDocument()

      const onTimeRow = within(table).getByText(onTime.code).closest('tr')
      expect(onTimeRow).toHaveAttribute('data-sla', 'pending')
      expect(onTimeRow).not.toHaveClass('bg-status-error-bg/40')
      expect(within(onTimeRow).getByText('Responder en 1 h')).toBeInTheDocument()
    })

    it('un ticket con fecha de apertura inválida no rompe la Bandeja', async () => {
      const broken = getDb().tickets.find((t) => t.status === 'abierto')
      Object.assign(broken, { openedAt: 'no-es-fecha', lastActivityAt: new Date().toISOString() })

      const { table } = await openInbox()
      const row = within(table).getByText(broken.code).closest('tr')
      expect(row).toHaveAttribute('data-sla', 'unknown')
      expect(within(row).getByText('SLA sin datos')).toBeInTheDocument()
      expect(within(table).getAllByRole('row').length).toBeGreaterThan(2)
    })
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
