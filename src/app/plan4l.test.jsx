// Plan 4l: duración promedio por tarea (Syncs) y por tipo (Eventos), calculada en el front.
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { eventTypeLabel } from '@/features/events/constants'
import { matchCorrections } from '@/features/events/corrections'
import { MISSING_TASK_LABEL } from '@/features/syncs/constants'
import { tenantEvents, tenantSyncs, toApiEvent, toClientSync } from '@/mocks/operations'
import { server } from '@/mocks/server'
import { averageDurations } from '@/lib/durations'
import { formatMilliseconds, formatNumber } from '@/lib/format'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

const acmeSyncs = tenantSyncs('ACME').map(toClientSync)
const acmeEvents = tenantEvents('ACME').map((raw) => toApiEvent(raw))
const FINISHED = ['completed', 'destination_created', 'destination_created_origin_error', 'errored']

const syncStats = (syncs) =>
  averageDurations(
    syncs.filter((s) => s.status !== 'running'),
    {
      start: (s) => s.startedAt,
      end: (s) => s.finishedAt,
      group: (s) => ({ key: s.task?.id ?? '', label: s.task?.name ?? MISSING_TASK_LABEL }),
    },
  )
const eventStats = (events) =>
  averageDurations(
    events.filter((e) => FINISHED.includes(e.status)),
    {
      start: (e) => e.createdAt,
      end: (e) => e.updatedAt,
      group: (e) => ({ key: e.type, label: eventTypeLabel(e.type) }),
    },
  )

const overallTile = () => screen.getByRole('group', { name: 'Promedio general' })

async function expectSummary(title, stats, noun) {
  const card = await screen.findByRole('region', { name: title })
  await waitFor(() =>
    expect(
      within(overallTile()).getByText(formatMilliseconds(stats.overall.averageMs)),
    ).toBeVisible(),
  )
  expect(
    within(overallTile()).getByText(`${formatNumber(stats.overall.count)} ${noun}`),
  ).toBeInTheDocument()
  // Un renglón por grupo, de mayor a menor promedio, con su promedio y cantidad.
  // La primera tarjeta es "Promedio general"; después, una por grupo.
  const rows = within(within(card).getByRole('list', { name: title }))
    .getAllByRole('listitem')
    .slice(1)
  expect(rows.map((row) => row.textContent)).toEqual(
    stats.groups.map(
      (group) =>
        `${group.label}${formatMilliseconds(group.averageMs)}${formatNumber(group.count)} ${
          group.count === 1 ? noun.replace(/s$/, '') : noun
        }`,
    ),
  )
  return card
}

describe('Syncs: duración promedio por tarea', () => {
  it('cliente: promedio por tarea y general, con los filtros de la página', async () => {
    const requests = recordRequests('/api/syncs')
    renderApp({ route: '/syncs?vacias=1', session: client })
    const stats = syncStats(acmeSyncs)
    expect(stats.groups.length).toBeGreaterThan(1)
    await expectSummary('Duración promedio por tarea', stats, 'corridas')
    // "Promedio general" se distingue con el color principal (plan 4n).
    expect(overallTile()).toHaveClass('bg-primary')
    const durationRequests = requests.filter((r) => r.url.searchParams.get('pageSize') === '100')
    expect(durationRequests.length).toBeGreaterThan(0)
    expect(durationRequests[0].url.searchParams.get('hideEmpty')).toBeNull()
  })

  it('sigue el filtro de estado y "Ocultar corridas sin cambios"', async () => {
    const requests = recordRequests('/api/syncs')
    renderApp({ route: '/syncs?status=completed', session: client })
    const stats = syncStats(
      acmeSyncs.filter((s) => s.status === 'completed' && s.counts.processed > 0),
    )
    await expectSummary('Duración promedio por tarea', stats, 'corridas')
    const query = requests.find((r) => r.url.searchParams.get('pageSize') === '100').url
      .searchParams
    expect(query.get('status')).toBe('completed')
    expect(query.get('hideEmpty')).toBe('true')
  })

  it('"En curso": no pide nada y explica por qué', async () => {
    const requests = recordRequests('/api/syncs')
    renderApp({ route: '/syncs?status=running', session: client })
    expect(
      await screen.findByText('Las corridas en curso todavía no tienen duración.'),
    ).toBeInTheDocument()
    await screen.findByRole('table', { name: 'Syncs' })
    expect(requests.filter((r) => r.url.searchParams.get('pageSize') === '100')).toEqual([])
    expect(within(overallTile()).getByText('—')).toBeInTheDocument()
  })

  it('con más de 1.000 corridas usa las más recientes y lo avisa', async () => {
    const [sample] = acmeSyncs.filter((s) => s.finishedAt)
    const pages = []
    server.use(
      http.get('/api/syncs', ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page'))
        const pageSize = Number(url.searchParams.get('pageSize'))
        pages.push(page)
        const items = Array.from({ length: pageSize }, (_, i) => ({
          ...sample,
          id: `s-${page}-${i}`,
        }))
        return HttpResponse.json({ items, page, pageSize, total: 2500 })
      }),
    )
    renderApp({ route: '/syncs', session: client })
    expect(await screen.findByText(/Se usaron las 1\.000 más recientes\./)).toBeInTheDocument()
    expect(within(overallTile()).getByText('1.000 corridas')).toBeInTheDocument()
    expect(Math.max(...pages)).toBe(10)
  })

  it('si falla el cálculo, la tabla sigue y se puede reintentar', async () => {
    let fail = true
    server.use(
      http.get('/api/syncs', ({ request }) => {
        if (fail && new URL(request.url).searchParams.get('pageSize') === '100') {
          return HttpResponse.json({ error: 'internal_error' }, { status: 500 })
        }
        return undefined
      }),
    )
    const { user } = renderApp({ route: '/syncs?vacias=1', session: client })
    await screen.findByText(/\d+ resultados?/)
    const card = await screen.findByRole('region', { name: 'Duración promedio por tarea' })
    expect(await within(card).findByText('No se pudo calcular la duración.')).toBeInTheDocument()
    fail = false
    await user.click(within(card).getByRole('button', { name: 'Reintentar' }))
    await expectSummary('Duración promedio por tarea', syncStats(acmeSyncs), 'corridas')
  })

  it('Smarteam: la de la empresa elegida', async () => {
    const requests = recordRequests('/api/staff/tenants/ACME/syncs')
    renderApp({ route: '/syncs?empresa=ACME&vacias=1', session: staff })
    await screen.findByRole('region', { name: 'Duración promedio por tarea' })
    await waitFor(() =>
      expect(requests.some((r) => r.url.searchParams.get('pageSize') === '100')).toBe(true),
    )
  })
})

describe('Eventos: duración promedio por tipo', () => {
  it('cliente: promedio por tipo y general, solo eventos terminados', async () => {
    renderApp({ route: '/eventos', session: client })
    const stats = eventStats(acmeEvents)
    expect(stats.groups.length).toBeGreaterThan(1)
    expect(stats.overall.count).toBeLessThan(acmeEvents.length)
    await expectSummary('Duración promedio por tipo', stats, 'eventos')
  })

  it('"Corregido": mide solo los corregidos', async () => {
    const corrected = matchCorrections(acmeEvents, acmeEvents)
    renderApp({ route: '/eventos?status=corrected', session: client })
    const stats = eventStats(acmeEvents.filter((e) => corrected.has(e.id)))
    expect(stats.overall.count).toBeGreaterThan(0)
    await expectSummary('Duración promedio por tipo', stats, 'eventos')
  })

  it('"En cola": no pide nada y explica por qué', async () => {
    const requests = recordRequests('/api/events')
    renderApp({ route: '/eventos?status=waiting', session: client })
    expect(
      await screen.findByText('Los eventos en cola o procesándose todavía no terminaron.'),
    ).toBeInTheDocument()
    await screen.findByRole('table', { name: 'Eventos' })
    expect(requests.filter((r) => r.url.searchParams.get('pageSize') === '100')).toEqual([])
  })
})
