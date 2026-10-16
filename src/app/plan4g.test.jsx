// Plan 4g: id visible y copiable, y corridas con fallos sin detalle de errores.
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openDetail(route, session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1 })
  return app
}

describe('Id copiable', () => {
  it('detalle de corrida: muestra el id y lo copia', async () => {
    const { user } = await openDetail('/syncs/sync-acme-001')
    expect(screen.getByText('sync-acme-001')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copiar id' }))
    expect(await navigator.clipboard.readText()).toBe('sync-acme-001')
    expect(screen.getByRole('status')).toHaveTextContent('Id copiado')
  })

  it('detalle de evento: el id existente se puede copiar', async () => {
    const { user } = await openDetail('/eventos/ev-acme-001')
    await user.click(screen.getByRole('button', { name: 'Copiar id' }))
    expect(await navigator.clipboard.readText()).toBe('ev-acme-001')
  })

  it('nuevo ticket enlazado: el id del registro se puede copiar', async () => {
    renderApp({ route: '/soporte/nuevo?contexto=sync&id=sync-acme-001', session: client })
    expect(await screen.findByText('sync-acme-001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar id' })).toBeInTheDocument()
  })
})

describe('Corridas con fallos sin detalle', () => {
  it('fallidos sin errores guardados: "Sin detalle de errores", no "no tuvo errores"', async () => {
    await openDetail('/syncs/sync-acme-q06')
    expect(await screen.findByText('Sin detalle de errores')).toBeInTheDocument()
    expect(screen.getByText(/registró 1 fallido, pero no guardó el detalle/)).toBeInTheDocument()
    expect(screen.queryByText('Esta corrida no tuvo errores')).not.toBeInTheDocument()
  })

  it('Smarteam ve el mismo aviso', async () => {
    await openDetail('/syncs/sync-acme-q06?empresa=ACME', staff)
    expect(await screen.findByText('Sin detalle de errores')).toBeInTheDocument()
  })

  it('con eventId, el registro enlaza al detalle del evento', async () => {
    const { user, router } = await openDetail('/syncs/sync-acme-q05')
    const table = screen.getByRole('table', { name: 'Errores de la corrida' })
    await user.click(within(table).getByRole('link', { name: '18493000123' }))
    expect(router.state.location.pathname).toBe('/eventos/ev-acme-001')
  })
})
