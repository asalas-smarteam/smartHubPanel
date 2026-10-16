import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lastDaysRange } from '@/lib/dates'
import { formatNumber, formatSeconds } from '@/lib/format'
import { ticketMetrics } from '@/mocks/handlers/metrics'
import { server } from '@/mocks/server'
import { getTickets } from '@/mocks/tickets-db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

import { monthRows } from './summaries'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
// Los datos de ejemplo terminan el 12 de octubre de 2026: el "hoy" de estos tests.
const TODAY = new Date(2026, 9, 12, 15, 0)

/** Lo que la API simulada calcula para ACME en los últimos `days` días. */
function expected(days) {
  const range = lastDaysRange(days, TODAY)
  return ticketMetrics(
    getTickets().filter((t) => t.tenantKey === 'ACME'),
    { from: Date.parse(range.from), to: Date.parse(range.to), tz: range.tz },
  )
}

async function openMetrics(route = '/metricas', session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1, name: 'Métricas de soporte' })
  await screen.findByRole('region', { name: 'Indicadores' })
  return app
}

const tile = (label) =>
  within(screen.getByRole('region', { name: 'Indicadores' })).getByRole('group', { name: label })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Métricas: cliente (desactivadas por ahora)', () => {
  it('sin ítem en el menú y /metricas responde "No tienes acceso"', async () => {
    const requests = recordRequests('/api/tickets/metrics')
    renderApp({ route: '/metricas', session: client })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Métricas' })).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})

describe('Métricas: Smarteam', () => {
  it('el menú lleva a Métricas', async () => {
    const { user, router } = renderApp({ route: '/bandeja', session: staff })
    await user.click(await screen.findByRole('link', { name: 'Métricas' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Métricas de soporte' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/metricas')
  })

  it('pide los últimos 90 días y muestra los indicadores', async () => {
    const requests = recordRequests('/api/staff/tickets/metrics')
    await openMetrics('/metricas?empresa=ACME', staff)
    await waitFor(() =>
      expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
        ...lastDaysRange(90, TODAY),
        tenantKey: 'ACME',
      }),
    )
    const { totals } = expected(90)
    expect(await screen.findByText('Acme Industrial · últimos 90 días')).toBeInTheDocument()
    await waitFor(() => expect(tile('Resueltos')).toHaveTextContent(formatNumber(totals.resolved)))
    expect(tile('Resolución')).toHaveTextContent(formatSeconds(totals.medianResolutionSeconds))
    expect(tile('Abiertos ahora')).toHaveTextContent(formatNumber(totals.open))
    expect(
      screen.getByRole('table', { name: 'Resueltos por semana y tiempo de resolución' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '¿En cuánto tiempo se resuelven?' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Por categoría' })).toBeVisible()
  })

  it('12 meses: período en la URL y columnas agrupadas por mes', async () => {
    const requests = recordRequests('/api/staff/tickets/metrics')
    const { user, router } = await openMetrics('/metricas', staff)
    await user.click(screen.getByRole('button', { name: '12 meses' }))
    const table = await screen.findByRole('table', { name: 'Resueltos por mes' })
    expect(router.state.location.search).toBe('?periodo=365')
    expect(requests.at(-1).url.searchParams.get('from')).toBe(lastDaysRange(365, TODAY).from)
    const months = monthRows(expected(365).byWeek)
    expect(within(table).getAllByRole('row')).toHaveLength(months.length + 1)
    expect(screen.getByText('Todas las empresas · últimos 12 meses')).toBeInTheDocument()
  })

  it('período desconocido en la URL: usa 90 días', async () => {
    await openMetrics('/metricas?periodo=7', staff)
    expect(screen.getByRole('button', { name: '90 días' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sin tickets: estado vacío', async () => {
    const empty = { ...expected(90), byTenant: [] }
    empty.totals = Object.fromEntries(
      Object.keys(empty.totals).map((key) => [key, key.startsWith('median') ? null : 0]),
    )
    server.use(http.get('/api/staff/tickets/metrics', () => HttpResponse.json(empty)))
    await openMetrics('/metricas', staff)
    expect(screen.getByText('Todavía no hay tickets en este período')).toBeInTheDocument()
  })

  it('todas las empresas, con la tabla por empresa', async () => {
    const requests = recordRequests('/api/staff/tickets/metrics')
    await openMetrics('/metricas', staff)
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual(lastDaysRange(90, TODAY))
    expect(screen.getByText('Todas las empresas · últimos 90 días')).toBeInTheDocument()
    const byTenant = screen.getByRole('region', { name: 'Por empresa' })
    expect(within(byTenant).getByRole('rowheader', { name: 'Acme Industrial' })).toBeVisible()
    expect(within(byTenant).getByRole('rowheader', { name: 'Globex Comercial' })).toBeVisible()
  })

  it('los filtros de empresa y categoría llegan a la API y quedan en la URL', async () => {
    const requests = recordRequests('/api/staff/tickets/metrics')
    const { user, router } = await openMetrics('/metricas', staff)
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Globex Comercial' }))
    await user.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await user.click(await screen.findByRole('option', { name: 'Precios' }))
    await waitFor(() =>
      expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual({
        ...lastDaysRange(90, TODAY),
        tenantKey: 'GLOBEX',
        category: 'precios',
      }),
    )
    expect(router.state.location.search).toBe('?empresa=GLOBEX&categoria=precios')
    expect(await screen.findByText('Globex Comercial · últimos 90 días')).toBeInTheDocument()
  })

  it('empresa o categoría desconocidas en la URL se ignoran', async () => {
    const requests = recordRequests('/api/staff/tickets/metrics')
    await openMetrics('/metricas?empresa=NOEXISTE&categoria=zzz', staff)
    const params = requests.at(-1).url.searchParams
    expect(params.has('tenantKey')).toBe(false)
    expect(params.has('category')).toBe(false)
  })

  it('avisa si una empresa no respondió (warnings)', async () => {
    server.use(
      http.get('/api/staff/tickets/metrics', () =>
        HttpResponse.json({
          ...expected(90),
          byTenant: [],
          warnings: [{ tenantKey: 'INITECH', error: 'timeout' }],
        }),
      ),
    )
    await openMetrics('/metricas', staff)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudieron sumar las métricas de: Initech Servicios.',
    )
  })
})
