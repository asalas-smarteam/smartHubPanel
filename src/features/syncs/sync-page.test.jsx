import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openSync(route, session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1 })
  return app
}

describe('Detalle de sync', () => {
  it('contadores, motivos de omisión y mensaje de error en texto', async () => {
    await openSync('/syncs/sync-acme-001')
    expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
    const counters = screen.getByRole('group', { name: 'Contadores' })
    expect(within(counters).getByText('Procesados').parentElement).toHaveTextContent('120')
    expect(within(counters).getByText('Fallidos').parentElement).toHaveTextContent('3')
    const skipped = screen.getByRole('region', { name: 'Motivos de omisión' })
    expect(within(skipped).getByText('Sin precio en la lista base')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Mensaje de error' })).toHaveTextContent(
      'Tres productos sin precio en la lista base.',
    )
  })

  it('error como objeto en el visor JSON; errores paginados aparte (errorsPage en la URL)', async () => {
    const requests = recordRequests('/api/syncs/sync-acme-004')
    const { user, router } = await openSync('/syncs/sync-acme-004')
    expect(
      within(screen.getByRole('region', { name: 'Mensaje de error' })).getByText(/BATCH_REJECTED/),
    ).toBeInTheDocument()

    expect(screen.getByRole('table', { name: 'Errores de la corrida' })).toBeInTheDocument()
    expect(await screen.findByText('60 resultados')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /página siguiente/i }))
    await waitFor(() => expect(requests.at(-1).url.searchParams.get('errorsPage')).toBe('2'))
    expect(router.state.location.search).toBe('?errorsPage=2')
    expect(await screen.findByText(/"record":"CLI-0026"/)).toBeInTheDocument()
  })

  it('corrida en curso: sin fin y sin duración', async () => {
    await openSync('/syncs/sync-acme-030')
    // Insignia de estado y "Fin".
    expect(screen.getAllByText('En curso')).toHaveLength(2)
    expect(await screen.findByText('Esta corrida no tuvo errores')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Reportar problema' })).not.toBeInTheDocument()
  })

  it('de otra empresa → "No encontramos lo que buscas"', async () => {
    renderApp({ route: '/syncs/sync-globex-001', session: client })
    expect(await screen.findByText('No encontramos lo que buscas')).toBeInTheDocument()
  })

  it('Smarteam por empresa: vuelve a la lista con la empresa', async () => {
    await openSync('/syncs/sync-globex-001?empresa=GLOBEX', staff)
    expect(screen.getByRole('link', { name: 'Volver a Syncs' })).toHaveAttribute(
      'href',
      '/syncs?empresa=GLOBEX',
    )
  })
})
