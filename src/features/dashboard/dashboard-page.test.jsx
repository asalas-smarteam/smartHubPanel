import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lastDaysRange } from '@/lib/dates'
import { formatNumber, formatPercent } from '@/lib/format'
import { integrationSummary } from '@/mocks/handlers/dashboard'
import { applyCorrectionsToSummary, matchCorrections } from '@/features/events/corrections'
import { tenantEvents, toApiEvent } from '@/mocks/operations'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
// Los datos de ejemplo terminan el 12 de octubre de 2026: el "hoy" de estos tests.
const TODAY = new Date(2026, 9, 12, 15, 0)

/** Lo que el Inicio muestra para ACME en los últimos `days` días: F2 con los corregidos aparte. */
function expected(days) {
  const range = lastDaysRange(days, TODAY)
  const summary = integrationSummary(tenantEvents('ACME'), {
    from: Date.parse(range.from),
    to: Date.parse(range.to),
    tz: range.tz,
  })
  const events = tenantEvents('ACME').map((raw) => toApiEvent(raw))
  const corrections = matchCorrections(events, events)
  const from = Date.parse(range.from)
  const to = Date.parse(range.to)
  const corrected = events.filter((event) => {
    const at = Date.parse(event.createdAt)
    return corrections.has(event.id) && at >= from && at < to
  })
  return applyCorrectionsToSummary(summary, corrected)
}

async function openDashboard(route = '/inicio', session = client) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { name: 'Estado de la integración' })
  return app
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('Inicio: cliente', () => {
  it('el cliente entra al Inicio y pide los últimos 30 días con su zona horaria', async () => {
    const requests = recordRequests('/api/dashboard/integration')
    const { router } = renderApp({ route: '/', session: client })
    await screen.findByRole('heading', { name: 'Estado de la integración' })
    expect(router.state.location.pathname).toBe('/inicio')
    await waitFor(() => expect(requests.length).toBeGreaterThan(0))
    const range = lastDaysRange(30, TODAY)
    expect(Object.fromEntries(requests.at(-1).url.searchParams)).toEqual(range)
    expect(screen.getByText('Acme Industrial · últimos 30 días')).toBeInTheDocument()
  })

  it('héroe, indicadores y subtítulo con los totales', async () => {
    const { totals } = expected(30)
    await openDashboard()
    const hero = await screen.findByRole('region', { name: 'Resultado del período' })
    expect(
      within(hero).getByText(
        formatPercent(totals.created + totals.corrected, totals.documents).replace(/\s%$/, ''),
      ),
    ).toBeInTheDocument()
    expect(
      within(hero).getByRole('img', { name: /^Documentos del período: Creados / }),
    ).toHaveAccessibleName(
      `Documentos del período: Creados ${formatNumber(totals.created)}, Corregidos ${formatNumber(totals.corrected)}, Con error ${formatNumber(totals.errored)}, En cola o procesando ${formatNumber(totals.pending)} (total ${formatNumber(totals.documents)})`,
    )
    const kpis = screen.getByRole('region', { name: 'Indicadores' })
    expect(within(kpis).getByRole('group', { name: 'Documentos' })).toHaveTextContent(
      formatNumber(totals.documents),
    )
    expect(within(kpis).getByRole('group', { name: 'Con error' })).toHaveTextContent(
      String(totals.errored),
    )
    // Plan 4k: los corregidos aparte, y el héroe los cuenta como bien.
    expect(totals.corrected).toBeGreaterThan(0)
    expect(within(kpis).getByRole('group', { name: 'Corregidos' })).toHaveTextContent(
      String(totals.corrected),
    )
    expect(within(kpis).getByRole('group', { name: 'Negocios sin documento' })).toHaveTextContent(
      `de ${formatNumber(totals.references)} negocios`,
    )
    expect(
      screen.getByText(new RegExp(`^${formatNumber(totals.documents)} documentos recibidos del`)),
    ).toBeInTheDocument()
  })

  it('cambiar el período lo deja en la URL y lo pide a la API; 90 días agrupa por semana', async () => {
    const requests = recordRequests('/api/dashboard/integration')
    const { user, router } = await openDashboard()
    const periods = screen.getByRole('group', { name: 'Período' })
    expect(within(periods).getByRole('button', { name: '30 días' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(periods).getByRole('button', { name: '7 días' }))
    await waitFor(() =>
      expect(requests.at(-1).url.searchParams.get('from')).toBe(lastDaysRange(7, TODAY).from),
    )
    expect(router.state.location.search).toBe('?periodo=7')
    expect(await screen.findByRole('region', { name: 'Actividad por día' })).toBeInTheDocument()

    await user.click(within(periods).getByRole('button', { name: '90 días' }))
    expect(await screen.findByRole('region', { name: 'Actividad por semana' })).toBeInTheDocument()
  })

  it('un período inválido en la URL usa 30 días', async () => {
    await openDashboard('/inicio?periodo=45')
    expect(
      within(screen.getByRole('group', { name: 'Período' })).getByRole('button', {
        name: '30 días',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('causas de mayor a menor, con su grupo; los grupos suman los errores', async () => {
    const { causes, totals } = expected(30)
    await openDashboard()
    const card = await screen.findByRole('region', { name: 'Errores por causa' })
    const table = within(card).getByRole('table', { name: 'Errores por causa' })
    const names = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.firstChild.textContent)
    expect(names).toEqual(causes.map((cause) => cause.label))
    const groups = within(card).getByRole('table', { name: 'Por grupo de causa' })
    const sum = within(groups)
      .getAllByRole('row')
      .slice(1)
      .reduce((total, row) => total + Number(row.lastChild.textContent), 0)
    expect(sum).toBe(totals.errored)
  })

  it('cada negocio con más de un intento enlaza a Eventos filtrado por su referencia', async () => {
    const { multiAttempt } = expected(30)
    const [first] = multiAttempt.items
    await openDashboard()
    const card = await screen.findByRole('region', {
      name: 'Negocios que necesitaron más de un intento',
    })
    const link = within(card).getAllByRole('link')[0]
    expect(link).toHaveTextContent(first.title)
    expect(link).toHaveAttribute('href', `/eventos?referencia=${first.reference}`)
    expect(within(card).getAllByRole('article')).toHaveLength(multiAttempt.items.length)
  })

  it('sin "Tu soporte": las métricas de tickets son solo para Smarteam por ahora', async () => {
    const requests = recordRequests('/api/tickets/metrics')
    await openDashboard()
    await screen.findByRole('region', { name: 'Resultado del período' })
    expect(screen.queryByRole('region', { name: 'Tu soporte' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver métricas' })).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it('sin documentos en el período muestra el estado vacío', async () => {
    const empty = expected(30)
    empty.totals = {
      ...empty.totals,
      documents: 0,
      created: 0,
      errored: 0,
      pending: 0,
      references: 0,
      referencesWithoutDocument: 0,
    }
    empty.causes = []
    empty.groups = []
    empty.multiAttempt = { total: 0, items: [] }
    empty.byDay = empty.byDay.map((day) => ({ ...day, created: 0, errored: 0, pending: 0 }))
    server.use(http.get('/api/dashboard/integration', () => HttpResponse.json(empty)))
    await openDashboard()
    expect(await screen.findByText('Todavía no hay documentos en este período')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Errores por causa' })).not.toBeInTheDocument()
  })

  it('si falla, muestra el error con "Reintentar"', async () => {
    server.use(
      http.get('/api/dashboard/integration', () =>
        HttpResponse.json({ error: 'internal' }, { status: 500 }),
      ),
    )
    await openDashboard()
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('Inicio: Smarteam', () => {
  it('elige la empresa antes de pedir datos; no ve "Tu soporte"', async () => {
    const requests = recordRequests('/api/staff/tenants/ACME/dashboard/integration')
    const { user, router } = await openDashboard('/inicio', staff)
    expect(screen.getByText('Elige una empresa para ver su integración')).toBeInTheDocument()
    expect(requests).toHaveLength(0)

    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Acme Industrial' }))
    expect(await screen.findByRole('region', { name: 'Resultado del período' })).toBeInTheDocument()
    expect(requests.length).toBeGreaterThan(0)
    expect(router.state.location.search).toBe('?empresa=ACME')
    expect(screen.getByText('Acme Industrial · últimos 30 días')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Tu soporte' })).not.toBeInTheDocument()

    const card = screen.getByRole('region', { name: 'Negocios que necesitaron más de un intento' })
    expect(within(card).getAllByRole('link')[0].getAttribute('href')).toMatch(
      /^\/eventos\?referencia=\d+&empresa=ACME$/,
    )
  })
})
