import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
const reportLink = () => screen.queryByRole('link', { name: 'Reportar problema' })

async function open(route, session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1 })
  return app
}

describe('"Reportar problema": cuándo aparece', () => {
  it.each([
    ['evento con error', '/eventos/ev-acme-001'],
    ['evento creado en destino con error en el origen', '/eventos/ev-acme-010'],
    ['sync con error', '/syncs/sync-acme-001'],
    ['sync completada con fallidos', '/syncs/sync-acme-003'],
  ])('aparece en un %s', async (_name, route) => {
    await open(route)
    expect(reportLink()).toBeInTheDocument()
  })

  it.each([
    ['evento en proceso', '/eventos/ev-acme-002'],
    ['evento completado', '/eventos/ev-acme-004'],
    ['sync completada sin fallidos', '/syncs/sync-acme-002'],
  ])('no aparece en un %s', async (_name, route) => {
    await open(route)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(reportLink()).not.toBeInTheDocument()
  })

  it('Smarteam no lo ve (no tiene tickets.create)', async () => {
    await open('/eventos/ev-acme-001?empresa=ACME', staff)
    expect(screen.getByText('Con error')).toBeInTheDocument()
    expect(reportLink()).not.toBeInTheDocument()
  })
})

describe('"Reportar problema": flujo hasta el ticket', () => {
  it('desde un evento: contexto, categoría Documentos, resumen y ticket enlazado', async () => {
    const { user, router } = await open('/eventos/ev-acme-001')
    await user.click(reportLink())
    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    expect(router.state.location.search).toBe('?contexto=evento&id=ev-acme-001')

    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Documentos')
    expect(screen.getByText(/Se enlazará el evento/)).toBeInTheDocument()
    expect(await screen.findByText('Crear cotización')).toBeInTheDocument()
    expect(screen.getByText(/· Con error/)).toBeInTheDocument()
    expect(
      screen.getByText('El artículo ITEM-0042 no existe en el sistema destino.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Cotización con artículo inexistente')
    await user.type(screen.getByLabelText('Descripción'), 'El evento quedó con error.')
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    await screen.findByRole('heading', { name: 'Cotización con artículo inexistente' })

    const context = screen.getByRole('region', { name: 'Contexto enlazado' })
    expect(within(context).getByText(/Evento enlazado/)).toBeInTheDocument()
    expect(within(context).getByText('ev-acme-001')).toBeInTheDocument()

    const created = getDb().tickets.find((t) => t.title === 'Cotización con artículo inexistente')
    expect(created).toMatchObject({
      category: 'documentos',
      context: { type: 'webhookEvent', refId: 'ev-acme-001' },
    })
    expect(created.context.snapshot).toMatchObject({ status: 'errored', type: 'createQuotation' })
  })

  it('desde una sync: categoría Sincronización y resumen con los fallidos', async () => {
    const { user } = await open('/syncs/sync-acme-001')
    await user.click(reportLink())
    await screen.findByRole('heading', { name: 'Nuevo ticket' })
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Sincronización')
    expect(screen.getByText(/Se enlazará la sync/)).toBeInTheDocument()
    expect(await screen.findByText(/Con error · 3 fallidos/)).toBeInTheDocument()
    expect(screen.getByText('Tres productos sin precio en la lista base.')).toBeInTheDocument()
  })

  it('el ticket enlazado se ve en el detalle de Smarteam (bandeja)', async () => {
    const ticket = getDb().tickets.find((t) => t.context?.refId === 'sync-acme-001')
    await open(`/bandeja/${ticket.tenantKey}/${ticket.id}`, staff)
    const context = screen.getByRole('region', { name: 'Contexto enlazado' })
    expect(within(context).getByText(/Sync enlazada/)).toBeInTheDocument()
  })

  it('un registro que no es de su empresa se avisa antes de enviar', async () => {
    await open('/soporte/nuevo?contexto=sync&id=sync-globex-001')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos esa sync en tu empresa.',
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Crear sin enlazarlo' })).toBeInTheDocument(),
    )
  })
})
