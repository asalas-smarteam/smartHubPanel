// Planes 4h y 4i: filas clicables, intercambio del evento y contexto del ticket sin JSON.
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDb } from '@/mocks/db'
import { tenantEvents } from '@/mocks/operations'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openTable(route, name, session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const firstRow = (table) => within(table).getAllByRole('row')[1]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('filas clicables', () => {
  it('Eventos: un clic en cualquier parte de la fila abre el detalle', async () => {
    const { user, router, table } = await openTable('/eventos', 'Eventos')
    const cells = within(firstRow(table)).getAllByRole('cell')
    await user.click(cells.at(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/eventos/ev-acme-001'))
  })

  it('Eventos: Ctrl+clic abre el detalle en otra pestaña', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { user, router, table } = await openTable('/eventos', 'Eventos')
    const cells = within(firstRow(table)).getAllByRole('cell')
    await user.keyboard('{Control>}')
    await user.click(cells.at(-1))
    await user.keyboard('{/Control}')
    expect(open).toHaveBeenCalledWith('/eventos/ev-acme-001', '_blank', 'noopener')
    expect(router.state.location.pathname).toBe('/eventos')
  })

  it('Syncs: Smarteam abre la corrida desde la fila, con la empresa', async () => {
    const { user, router, table } = await openTable('/syncs?empresa=ACME', 'Syncs', staff)
    const cells = within(firstRow(table)).getAllByRole('cell')
    await user.click(cells.at(-1))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/syncs\/sync-acme-/))
    expect(router.state.location.search).toBe('?empresa=ACME')
  })
})

describe('intercambio del evento (plan 4i)', () => {
  const parts = ['Recibido del CRM', 'Enviado al ERP', 'Respuesta del ERP']

  it('cliente: lo recibido, lo enviado y la respuesta, sin credenciales', async () => {
    renderApp({ route: '/eventos/ev-acme-001', session: client })
    const section = await screen.findByRole('region', { name: 'Intercambio' })
    for (const name of parts) {
      expect(within(section).getByRole('region', { name })).toBeInTheDocument()
    }
    expect(within(section).getByRole('region', { name: 'Recibido del CRM' })).toHaveTextContent(
      'dealname',
    )
    expect(within(section).getByRole('region', { name: 'Enviado al ERP' })).toHaveTextContent(
      'CardCode',
    )
    expect(section).not.toHaveTextContent('Password')
    expect(screen.queryByRole('region', { name: 'Auditoría completa' })).not.toBeInTheDocument()
  })

  it('Smarteam: el intercambio y además la auditoría completa', async () => {
    renderApp({ route: '/eventos/ev-acme-001?empresa=ACME', session: staff })
    const section = await screen.findByRole('region', { name: 'Intercambio' })
    expect(within(section).getByRole('region', { name: 'Respuesta del ERP' })).toHaveTextContent(
      'Password',
    )
    expect(screen.getByRole('region', { name: 'Auditoría completa' })).toBeInTheDocument()
  })

  it('un evento que no se envió muestra "Sin datos." en lo enviado y la respuesta', async () => {
    const waiting = tenantEvents('ACME').find((e) => e.status === 'waiting')
    renderApp({ route: `/eventos/${waiting._id}`, session: client })
    const sent = await screen.findByRole('region', { name: 'Enviado al ERP' })
    expect(sent).toHaveTextContent('Sin datos.')
    expect(screen.getByRole('region', { name: 'Respuesta del ERP' })).toHaveTextContent(
      'Sin datos.',
    )
  })
})

describe('contexto del ticket', () => {
  it('cliente: resumen del evento y "Ver evento", sin el JSON', async () => {
    const ticket = getDb().tickets.find(
      (t) => t.tenantKey === 'ACME' && t.context?.type === 'webhookEvent',
    )
    const { user, router } = renderApp({ route: `/soporte/${ticket.id}`, session: client })
    const context = await screen.findByRole('region', { name: 'Contexto enlazado' })
    expect(within(context).queryByRole('tree')).not.toBeInTheDocument()
    expect(within(context).queryByText(/"refId"|"status"/)).not.toBeInTheDocument()
    await user.click(within(context).getByRole('link', { name: 'Ver evento' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/eventos/${ticket.context.refId}`),
    )
  })
})
