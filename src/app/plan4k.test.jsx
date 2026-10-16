// Plan 4k y 4k-bis: errores corregidos (calculados en el front) y filas clicables en Soporte,
// Bandeja y errores de corridas.
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { matchCorrections } from '@/features/events/corrections'
import { getDb } from '@/mocks/db'
import { tenantEvents, toApiEvent } from '@/mocks/operations'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

const acme = tenantEvents('ACME').map((raw) => toApiEvent(raw))
const corrections = matchCorrections(acme, acme)
const correctedId = [...corrections.keys()].find((id) => id.startsWith('ev-acme-0'))

async function openTable(route, name, session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const lastCell = (table) => within(within(table).getAllByRole('row')[1]).getAllByRole('cell').at(-1)

describe('errores corregidos (calculados en el front)', () => {
  it('la API no conoce "corregido": el front no lo manda como filtro', async () => {
    const requests = recordRequests('/api/events')
    await openTable('/eventos?status=corrected', 'Eventos')
    expect(requests.length).toBeGreaterThan(0)
    expect(requests.some((r) => r.url.searchParams.get('status') === 'corrected')).toBe(false)
  })

  it('filtro "Corregido" y "Con error" sin los corregidos', async () => {
    const corrected = corrections.size
    const errored = acme.filter((e) => e.status === 'errored').length - corrected
    await openTable('/eventos?status=corrected', 'Eventos')
    expect(screen.getByText(`${corrected} resultados`)).toBeInTheDocument()
    expect(screen.getAllByText('Corregido').length).toBeGreaterThan(1)
    renderApp({ route: '/eventos?status=errored', session: client })
    expect(await screen.findByText(`${errored} resultados`)).toBeInTheDocument()
  })

  it('sin filtro de estado, los errores corregidos de la página se marcan', async () => {
    const reference = acme.find((e) => e.id === correctedId).reference
    const sameReference = acme.filter((e) => e.reference === reference)
    const marked = sameReference.filter((e) => corrections.has(e.id)).length
    await openTable(`/eventos?referencia=${reference}`, 'Eventos')
    await waitFor(() => expect(screen.queryAllByText('Corregido')).toHaveLength(marked))
    expect(screen.getAllByText('Completado').length).toBeGreaterThan(0)
  })

  it('el detalle de un corregido enlaza al evento que lo corrigió', async () => {
    const { user, router } = renderApp({ route: `/eventos/${correctedId}`, session: client })
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent('Se corrigió en un reintento')
    expect(screen.queryByRole('link', { name: 'Reportar problema' })).not.toBeInTheDocument()
    await user.click(within(note).getByRole('link', { name: 'Ver el evento que lo corrigió' }))
    expect(router.state.location.pathname).toBe(`/eventos/${corrections.get(correctedId).id}`)
  })
})

describe('filas clicables (plan 4k)', () => {
  it('Soporte: la fila abre el ticket', async () => {
    const { user, router, table } = await openTable('/soporte', 'Tickets')
    await user.click(lastCell(table))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/soporte\/[^/]+$/))
    expect(router.state.location.pathname).not.toBe('/soporte/nuevo')
  })

  it('Bandeja: la fila abre el ticket de su empresa', async () => {
    const { user, router, table } = await openTable('/bandeja', 'Bandeja', staff)
    await user.click(lastCell(table))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/bandeja\/[^/]+\/[^/]+$/))
    const [, , tenantKey, id] = router.state.location.pathname.split('/')
    expect(getDb().tickets.some((t) => t.id === id && t.tenantKey === tenantKey)).toBe(true)
  })

  it('errores de una corrida: la fila con evento abre el evento', async () => {
    const { user, router } = renderApp({ route: '/syncs/sync-acme-q05', session: client })
    const table = await screen.findByRole('table', { name: 'Errores de la corrida' })
    await user.click(lastCell(table))
    await waitFor(() => expect(router.state.location.pathname).toBe('/eventos/ev-acme-001'))
  })
})
