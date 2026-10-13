import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email
const acme = (status) => getDb().tickets.find((t) => t.tenantKey === 'ACME' && t.status === status)

async function openTicket(ticket) {
  const app = renderApp({ route: `/soporte/${ticket.id}`, session: client })
  await screen.findByRole('heading', { name: ticket.title })
  return app
}

describe('Soporte: detalle del cliente', () => {
  it('muestra el hilo con "Smarteam" en sus mensajes e imágenes con la URL del ticket', async () => {
    const ticket = acme('esperando_cliente')
    await openTicket(ticket)
    const staffMessages = screen.getAllByRole('article', { name: /Mensaje de Equipo Smarteam/ })
    for (const message of staffMessages)
      expect(within(message).getByText('Smarteam')).toBeInTheDocument()
    const withImage = staffMessages.find((message) => within(message).queryByRole('img'))
    const image = within(withImage).getByRole('img')
    expect(image.getAttribute('src')).toMatch(new RegExp(`^/api/tickets/${ticket.id}/attachments/`))
    expect(screen.getByText('Smarteam espera tu respuesta para seguir.')).toBeInTheDocument()
  })

  it('responder en "Esperando cliente" lo deja "En progreso"', async () => {
    const ticket = acme('esperando_cliente')
    const { user } = await openTicket(ticket)
    await user.type(screen.getByLabelText('Tu respuesta'), 'Usó la lista mayorista')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Usó la lista mayorista')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('En progreso')[0]).toBeInTheDocument())
    expect(getDb().tickets.find((t) => t.id === ticket.id).status).toBe('en_progreso')
  })

  it('resuelto: sin caja de respuesta; "Sigue fallando" exige mensaje y lo reabre', async () => {
    const ticket = acme('resuelto')
    const before = ticket.reopenCount
    const { user } = await openTicket(ticket)
    expect(screen.queryByLabelText('Tu respuesta')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sigue fallando' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sigue fallando' })
    await user.click(within(dialog).getByRole('button', { name: 'Reabrir ticket' }))
    expect(await within(dialog).findByText('Cuéntanos qué sigue fallando.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('¿Qué está pasando?'), 'Pasa con clientes nuevos')
    await user.click(within(dialog).getByRole('button', { name: 'Reabrir ticket' }))
    expect(await screen.findByLabelText('Tu respuesta')).toBeInTheDocument()
    expect(screen.getAllByText('Abierto')[0]).toBeInTheDocument()
    expect(getDb().tickets.find((t) => t.id === ticket.id).reopenCount).toBe(before + 1)
  })

  it('nunca muestra la resolución interna, aunque la respuesta la trajera por error', async () => {
    const ticket = acme('resuelto')
    server.use(
      http.get(`/api/tickets/${ticket.id}`, async () => {
        const { toClientDetail } = await import('@/mocks/tickets-db')
        return HttpResponse.json({
          ...toClientDetail(ticket),
          internalResolution: {
            text: 'SECRETO INTERNO',
            updatedAt: ticket.openedAt,
            updatedBy: { name: 'x' },
          },
        })
      }),
    )
    await openTicket(ticket)
    expect(screen.queryByText(/SECRETO INTERNO/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Resolución interna/i)).not.toBeInTheDocument()
  })

  it('ticket de otra empresa → "Ticket no encontrado"', async () => {
    const globex = getDb().tickets.find((t) => t.tenantKey === 'GLOBEX')
    renderApp({ route: `/soporte/${globex.id}`, session: client })
    expect(await screen.findByText('Ticket no encontrado')).toBeInTheDocument()
    expect(screen.queryByText(globex.title)).not.toBeInTheDocument()
  })

  it('si el ticket cambió (409), avisa y recarga', async () => {
    const ticket = acme('esperando_cliente')
    const { user } = await openTicket(ticket)
    server.use(
      http.post(`/api/tickets/${ticket.id}/messages`, () =>
        HttpResponse.json({ error: 'invalid_transition' }, { status: 409 }),
      ),
    )
    await user.type(screen.getByLabelText('Tu respuesta'), 'Hola')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText(/El ticket cambió mientras lo veías/)).toBeInTheDocument()
  })
})
