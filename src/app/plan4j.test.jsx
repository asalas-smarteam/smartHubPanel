// Plan 4j: exportar Eventos a Excel con los filtros de la pantalla.
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { matchCorrections } from '@/features/events/corrections'
import { downloadBlob } from '@/lib/download'
import { tenantEvents, toApiEvent } from '@/mocks/operations'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

vi.mock('@/lib/download', () => ({ downloadBlob: vi.fn() }))

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

afterEach(() => {
  vi.mocked(downloadBlob).mockClear()
})

async function exportFrom(route, session) {
  const app = renderApp({ route, session })
  await screen.findByText(/\d+ resultados?/)
  await app.user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1), { timeout: 8000 })
  return app
}

describe('exportar eventos a Excel', () => {
  it('cliente: con los filtros activos, pide la lista y el detalle de cada evento', async () => {
    const list = recordRequests('/api/events')
    const acme = tenantEvents('ACME').map((raw) => toApiEvent(raw))
    const corrections = matchCorrections(acme, acme)
    const errored = acme.filter((e) => e.status === 'errored' && !corrections.has(e.id))
    await exportFrom('/eventos?status=errored', client)

    const [blob, name] = vi.mocked(downloadBlob).mock.calls[0]
    expect(name).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2} Acme Industrial Events report\.xlsx$/,
    )
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(blob.size).toBeGreaterThan(1000)

    const exportCalls = list.filter((r) => r.url.searchParams.get('pageSize') === '100')
    expect(exportCalls.length).toBeGreaterThan(0)
    // "Con error" se pide como tal; los demás estados son la búsqueda de reintentos que corrigen.
    const statuses = new Set(exportCalls.map((r) => r.url.searchParams.get('status')))
    expect(statuses.has('errored')).toBe(true)
    expect(statuses.has('corrected')).toBe(false)
    expect(await screen.findByText(`Se exportaron ${errored.length} eventos.`)).toBeInTheDocument()
  })

  it('Smarteam: el nombre lleva la empresa elegida', async () => {
    await exportFrom('/eventos?empresa=GLOBEX&status=errored', staff)
    const [, name] = vi.mocked(downloadBlob).mock.calls[0]
    expect(name).toMatch(/ Globex Comercial Events report\.xlsx$/)
  })
})
