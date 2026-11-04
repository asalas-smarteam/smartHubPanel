import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { toStaffDetail } from '@/mocks/tickets-db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const staff = DEMO_ACCOUNTS.smarteam.email
const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const withWorkLog = () => getDb().tickets.find((ticket) => ticket.workLog?.length)
const NOTE = /La lista de precios del ERP no tenía fecha de vigencia/
const EMPTY = 'Sin horas registradas. Se cargan desde la skill de registro de tiempo.'

async function openStaff(ticket) {
  renderApp({ route: `/bandeja/${ticket.tenantKey}/${ticket.id}`, session: staff })
  await screen.findByRole('heading', { name: ticket.title })
  return screen.findByRole('region', { name: 'Registro de trabajo' })
}

describe('Registro de trabajo en el detalle (plan 4z)', () => {
  it('Smarteam ve el total y cada entrada: autor, fecha, horas, proyecto y nota interna', async () => {
    const ticket = withWorkLog()
    const card = await openStaff(ticket)
    expect(within(card).getByText('4,25 h')).toBeInTheDocument()

    const entries = within(card).getAllByRole('listitem')
    expect(entries).toHaveLength(2)
    // La más reciente primero.
    const [latest, oldest] = entries
    expect(within(latest).getByText('3,5 h')).toBeInTheDocument()
    expect(within(latest).getByText('Equipo Smarteam')).toBeInTheDocument()
    expect(within(latest).getByText(/Proyecto del CRM:/)).toHaveTextContent(
      'Proyecto del CRM: 18452730011',
    )
    const note = within(latest).getByText('Nota interna').closest('details')
    expect(note).not.toHaveAttribute('open')
    expect(within(note).getByText(NOTE)).toBeInTheDocument()

    expect(within(oldest).getByText('0,75 h')).toBeInTheDocument()
    expect(within(oldest).queryByText(/Proyecto del CRM/)).not.toBeInTheDocument()
    expect(within(oldest).queryByText('Nota interna')).not.toBeInTheDocument()

    // Va después de la tarjeta del SLA.
    const aside = screen.getByRole('complementary', { name: 'Gestión del ticket' })
    const regions = within(aside)
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'))
    expect(regions.indexOf('Registro de trabajo')).toBe(regions.indexOf('SLA') + 1)
  })

  it('sin entradas muestra el estado vacío', async () => {
    const ticket = getDb().tickets.find(
      (one) => one.tenantKey === 'GLOBEX' && one.status === 'esperando_cliente',
    )
    const card = await openStaff(ticket)
    expect(within(card).getByText(EMPTY)).toBeInTheDocument()
    expect(within(card).queryByText(/ h$/)).not.toBeInTheDocument()
  })

  it('si la API todavía no manda workLog, la tarjeta queda vacía (sin error)', async () => {
    const ticket = withWorkLog()
    server.use(
      http.get('/api/staff/tenants/:tenantKey/tickets/:id', () => {
        const { workLog: _omitted, ...rest } = toStaffDetail(ticket)
        return HttpResponse.json(rest)
      }),
    )
    const card = await openStaff(ticket)
    expect(within(card).getByText(EMPTY)).toBeInTheDocument()
  })

  it('el cliente no ve horas ni notas internas en su detalle', async () => {
    const ticket = withWorkLog()
    renderApp({ route: `/soporte/${ticket.id}`, session: client })
    await screen.findByRole('heading', { name: ticket.title })
    // El resumen sí es un mensaje público.
    expect(await screen.findByText(/Revisamos la lista de precios/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Registro de trabajo' })).not.toBeInTheDocument()
    expect(screen.queryByText('4,25 h')).not.toBeInTheDocument()
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
    expect(screen.queryByText(/Proyecto del CRM/)).not.toBeInTheDocument()
  })
})
