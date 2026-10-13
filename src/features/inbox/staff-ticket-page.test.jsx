import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const staff = DEMO_ACCOUNTS.smarteam.email
const find = (predicate) => getDb().tickets.find(predicate)
const fresh = (ticket) => getDb().tickets.find((t) => t.id === ticket.id)

async function openTicket(ticket) {
  const app = renderApp({ route: `/bandeja/${ticket.tenantKey}/${ticket.id}`, session: staff })
  await screen.findByRole('heading', { name: ticket.title })
  return app
}

const actions = () => screen.getByRole('complementary', { name: 'Gestión del ticket' })
const timeline = () => screen.getByRole('region', { name: 'Línea de tiempo' })

describe('Detalle de Smarteam', () => {
  it('primera respuesta: pasa a "En progreso" y aparece en la línea de tiempo', async () => {
    const ticket = find((t) => t.status === 'abierto' && !t.firstResponseAt)
    const { user } = await openTicket(ticket)
    expect(within(timeline()).queryByText('Primera respuesta de Smarteam')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Responder al cliente'), 'Lo estamos revisando')
    await user.click(screen.getByRole('button', { name: 'Responder' }))
    expect(await screen.findByText('Lo estamos revisando')).toBeInTheDocument()
    expect(await within(timeline()).findByText('Primera respuesta de Smarteam')).toBeInTheDocument()
    expect(fresh(ticket)).toMatchObject({
      status: 'en_progreso',
      firstResponseAt: expect.any(String),
    })
  })

  it('"Esperando cliente" solo en "En progreso"', async () => {
    const open = find((t) => t.status === 'abierto')
    const { unmount } = await openTicket(open)
    expect(
      within(actions()).queryByRole('button', { name: 'Esperando cliente' }),
    ).not.toBeInTheDocument()
    unmount()

    const working = find((t) => t.status === 'en_progreso')
    const { user } = await openTicket(working)
    await user.click(within(actions()).getByRole('button', { name: 'Esperando cliente' }))
    await waitFor(() => expect(fresh(working).status).toBe('esperando_cliente'))
    await waitFor(() =>
      expect(
        within(actions()).queryByRole('button', { name: 'Esperando cliente' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('resolver exige los dos textos y deja la resolución interna visible', async () => {
    const working = find((t) => t.status === 'en_progreso')
    const { user } = await openTicket(working)
    await user.click(within(actions()).getByRole('button', { name: 'Resolver' }))
    const dialog = await screen.findByRole('dialog', { name: 'Resolver ticket' })
    await user.click(within(dialog).getByRole('button', { name: 'Resolver ticket' }))
    expect(
      await within(dialog).findByText('Escribe el mensaje para el cliente.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Escribe cómo se resolvió/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Mensaje al cliente'), 'Corregimos el mapeo')
    await user.type(within(dialog).getByLabelText('Resolución interna'), 'Campo mal apuntado')
    await user.click(within(dialog).getByRole('button', { name: 'Resolver ticket' }))

    const card = await screen.findByRole('region', { name: 'Resolución interna' })
    expect(await within(card).findByText('Campo mal apuntado')).toBeInTheDocument()
    expect(fresh(working).status).toBe('resuelto')
    expect(await screen.findByText('Corregimos el mapeo')).toBeInTheDocument()
    expect(screen.queryByLabelText('Responder al cliente')).not.toBeInTheDocument()
    expect(
      within(actions()).getByRole('button', { name: 'Volver a trabajarlo' }),
    ).toBeInTheDocument()
  })

  it('"Volver a trabajarlo" en un resuelto lo pasa a "En progreso"', async () => {
    const resolved = find((t) => t.status === 'resuelto')
    const { user } = await openTicket(resolved)
    await user.click(within(actions()).getByRole('button', { name: 'Volver a trabajarlo' }))
    await waitFor(() => expect(fresh(resolved).status).toBe('en_progreso'))
    expect(await screen.findByLabelText('Responder al cliente')).toBeInTheDocument()
  })

  it('editar la resolución interna', async () => {
    const resolved = find((t) => t.status === 'resuelto')
    const { user } = await openTicket(resolved)
    const card = screen.getByRole('region', { name: 'Resolución interna' })
    expect(within(card).getByText(resolved.internalResolution.text)).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Editar' }))
    const textbox = within(card).getByLabelText('Resolución interna')
    await user.clear(textbox)
    await user.type(textbox, 'Nota corregida')
    await user.click(within(card).getByRole('button', { name: 'Guardar' }))
    expect(await within(card).findByText('Nota corregida')).toBeInTheDocument()
    expect(fresh(resolved).internalResolution.text).toBe('Nota corregida')
  })

  it('si otro dev cambió el estado (409), avisa y recarga', async () => {
    const working = find((t) => t.status === 'en_progreso')
    const { user } = await openTicket(working)
    server.use(
      http.post(`/api/staff/tenants/${working.tenantKey}/tickets/${working.id}/status`, () =>
        HttpResponse.json({ error: 'invalid_transition' }, { status: 409 }),
      ),
    )
    await user.click(within(actions()).getByRole('button', { name: 'Esperando cliente' }))
    expect(await screen.findByText(/El ticket cambió mientras lo veías/)).toBeInTheDocument()
  })

  it('muestra el contexto con el visor JSON y la empresa', async () => {
    const withContext = find((t) => t.context?.type === 'syncLog')
    await openTicket(withContext)
    const context = screen.getByRole('region', { name: 'Contexto enlazado' })
    expect(within(context).getByText(/Sync enlazada/)).toBeInTheDocument()
    expect(within(context).getByText(withContext.context.refId)).toBeInTheDocument()
    expect(screen.getByText('Acme Industrial')).toBeInTheDocument()
  })

  it('ticket de un tenant equivocado → "Ticket no encontrado"', async () => {
    const acme = find((t) => t.tenantKey === 'ACME')
    renderApp({ route: `/bandeja/GLOBEX/${acme.id}`, session: staff })
    expect(await screen.findByText('Ticket no encontrado')).toBeInTheDocument()
  })
})
