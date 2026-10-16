// Plan 4f: ajustes del front por el plan 5 del backend (contrato 06-ajustes-plan-5.md, G1 a G5).
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { syncPageSchema } from '@/features/syncs/schemas'
import { eventSchema } from '@/features/events/schemas'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { isBulkPage, recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openSyncs(route = '/syncs', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Syncs' })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

describe('G1: corridas de la cola de eventos', () => {
  it('el esquema acepta la tarea "event_queue"', () => {
    const queue = { id: 'event_queue', name: 'Cola de eventos', type: 'event_queue' }
    expect(() =>
      syncPageSchema.parse({
        items: [
          {
            id: 's1',
            task: queue,
            objectType: 'deal',
            status: 'completed',
            counts: { processed: 1, sent: 1, failed: 0, updated: 0, skipped: 0 },
            skippedReasons: [],
            errorMessage: null,
            startedAt: '2026-10-14T10:00:00.000Z',
            finishedAt: '2026-10-14T10:00:01.000Z',
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
    ).not.toThrow()
  })

  it('"Cola de eventos" aparece en el filtro de tareas y filtra con taskId=event_queue', async () => {
    const requests = recordRequests('/api/syncs', undefined, { ignore: isBulkPage })
    const { user, table } = await openSyncs()
    await user.click(screen.getByRole('combobox', { name: 'Tarea' }))
    await user.click(await screen.findByRole('option', { name: 'Cola de eventos' }))
    await waitFor(() => expect(requests.at(-1).url.searchParams.get('taskId')).toBe('event_queue'))
    await waitFor(() =>
      expect(
        within(table)
          .getAllByRole('row')
          .slice(1)
          .every((row) => row.textContent.includes('Cola de eventos')),
      ).toBe(true),
    )
  })
})

describe('G2: ocultar corridas sin cambios', () => {
  it('activado por defecto (hideEmpty=true); al apagarlo queda en la URL y pide todas', async () => {
    const requests = recordRequests('/api/syncs', undefined, { ignore: isBulkPage })
    const { user, router } = await openSyncs()
    const toggle = screen.getByRole('checkbox', { name: 'Ocultar corridas sin cambios' })
    expect(toggle).toBeChecked()
    expect(requests.at(-1).url.searchParams.get('hideEmpty')).toBe('true')

    await user.click(toggle)
    await waitFor(() => expect(requests.at(-1).url.searchParams.has('hideEmpty')).toBe(false))
    expect(router.state.location.search).toBe('?vacias=1')
    expect(toggle).not.toBeChecked()
  })

  it('Smarteam también lo tiene, por empresa', async () => {
    const requests = recordRequests('/api/staff/tenants/ACME/syncs', undefined, {
      ignore: isBulkPage,
    })
    await openSyncs('/syncs?empresa=ACME', staff)
    expect(requests.at(-1).url.searchParams.get('hideEmpty')).toBe('true')
  })
})

describe('G3: causa de los errores de eventos', () => {
  it('el esquema acepta cause (y null)', () => {
    const base = {
      id: 'e',
      type: 'createQuotation',
      status: 'errored',
      retries: 3,
      maxRetries: 3,
      lastError: 'x',
      reference: null,
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
    }
    const cause = { key: 'timeout', label: 'Tiempo de espera agotado', group: 'connectivity' }
    expect(eventSchema.parse({ ...base, cause }).cause).toEqual(cause)
    expect(eventSchema.parse({ ...base, cause: null }).cause).toBeNull()
  })

  it('la lista muestra la causa junto al error', async () => {
    renderApp({ route: '/eventos', session: client })
    const table = await screen.findByRole('table', { name: 'Eventos' })
    await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
    const first = within(table).getAllByRole('row')[1]
    expect(within(first).getByText('Artículo inexistente en destino')).toBeInTheDocument()
    expect(within(first).getByText(/ITEM-0042/)).toBeInTheDocument()
  })

  it('el detalle muestra la causa con su grupo', async () => {
    renderApp({ route: '/eventos/ev-acme-001', session: client })
    const cause = await screen.findByRole('group', { name: 'Causa' })
    expect(cause).toHaveTextContent('Artículo inexistente en destino')
    expect(cause).toHaveTextContent('Validación del destino')
  })
})

describe('G4: errores de corridas en la vista de cliente', () => {
  it('cliente: resumen en texto y errores en tabla Registro / Mensaje', async () => {
    renderApp({ route: '/syncs/sync-acme-q05', session: client })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cola de eventos' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Mensaje de error' })).toHaveTextContent(
      '1 error(es) en la corrida',
    )
    const table = screen.getByRole('table', { name: 'Errores de la corrida' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Registro', 'Mensaje'])
    expect(within(table).getByText('Respuesta inesperada del servidor (500).')).toBeInTheDocument()
  })

  it('Smarteam: mensaje y errores crudos, en el visor JSON', async () => {
    renderApp({ route: '/syncs/sync-acme-q05?empresa=ACME', session: staff })
    const region = await screen.findByRole('region', { name: 'Mensaje de error' })
    expect(within(region).getByText(/request/)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Errores de la corrida' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Detalle'])
  })
})

describe('G5: contexto del ticket con la causa', () => {
  it('"Nuevo ticket" desde un evento muestra la causa en el resumen', async () => {
    renderApp({ route: '/soporte/nuevo?contexto=evento&id=ev-acme-001', session: client })
    expect(await screen.findByText(/Artículo inexistente en destino/)).toBeInTheDocument()
  })
})
