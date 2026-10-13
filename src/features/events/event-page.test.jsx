import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openEvent(route, session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1 })
  return app
}

describe('Detalle de evento', () => {
  it('cliente: estado, referencia, reintentos y último error; sin Payload ni Auditoría', async () => {
    await openEvent('/eventos/ev-acme-001')
    expect(screen.getByRole('heading', { level: 1, name: 'Crear cotización' })).toBeInTheDocument()
    expect(screen.getByText('Con error')).toBeInTheDocument()
    expect(screen.getByText('3 de 3')).toBeInTheDocument()
    const lastError = screen.getByRole('region', { name: 'Último error' })
    expect(lastError).toHaveTextContent('El artículo ITEM-0042 no existe en el sistema destino.')
    expect(screen.queryByRole('region', { name: 'Payload' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Auditoría' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Eventos' })).toHaveAttribute(
      'href',
      '/eventos',
    )
  })

  it('cliente: aunque la API trajera payload por error, no se muestra', async () => {
    server.use(
      http.get('/api/events/:id', () =>
        HttpResponse.json({
          id: 'ev-acme-001',
          type: 'createQuotation',
          status: 'completed',
          retries: 0,
          maxRetries: 3,
          lastError: null,
          reference: '1',
          createdAt: '2026-10-10T14:00:00.000Z',
          updatedAt: '2026-10-10T14:00:00.000Z',
          payload: { secreto: 'no' },
          audit: { secreto: 'no' },
        }),
      ),
    )
    await openEvent('/eventos/ev-acme-001')
    expect(screen.queryByRole('region', { name: 'Payload' })).not.toBeInTheDocument()
    expect(screen.queryByText(/secreto/)).not.toBeInTheDocument()
  })

  it('tipo desconocido se muestra tal cual; evento sin error no tiene bloque de error', async () => {
    await openEvent('/eventos/ev-acme-013')
    expect(screen.getByRole('heading', { level: 1, name: 'updateContact' })).toBeInTheDocument()
  })

  it('de otra empresa o inexistente → "No encontramos lo que buscas"', async () => {
    renderApp({ route: '/eventos/ev-globex-001', session: client })
    expect(await screen.findByText('No encontramos lo que buscas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('Smarteam con staff.events.raw ve Payload y Auditoría en el visor JSON', async () => {
    await openEvent('/eventos/ev-acme-001?empresa=ACME', staff)
    const payload = screen.getByRole('region', { name: 'Payload' })
    expect(within(payload).getByText(/deal/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Auditoría' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Eventos' })).toHaveAttribute(
      'href',
      '/eventos?empresa=ACME',
    )
  })

  it('Smarteam sin staff.events.raw no los ve', async () => {
    getDb().users.find((user) => user.email === staff).permissions = ['events.read', 'syncs.read']
    await openEvent('/eventos/ev-acme-001?empresa=ACME', staff)
    expect(screen.getByText('Con error')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Payload' })).not.toBeInTheDocument()
  })

  it('Smarteam sin ?empresa= primero elige la empresa', async () => {
    const { user } = renderApp({ route: '/eventos/ev-globex-001', session: staff })
    expect(await screen.findByText('Elige una empresa para ver este evento')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Globex Comercial' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crear cotización' }),
    ).toBeInTheDocument()
  })
})
