// Plan 4u: exportar a Excel un solo evento desde su detalle.
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { REPORT_COLUMNS } from '@/features/events/export'
import { downloadBlob } from '@/lib/download'
import { buildWorkbook } from '@/lib/xlsx/workbook'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

vi.mock('@/lib/download', () => ({ downloadBlob: vi.fn() }))
vi.mock('@/lib/xlsx/workbook', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, buildWorkbook: vi.fn(original.buildWorkbook) }
})

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

afterEach(() => {
  vi.mocked(downloadBlob).mockClear()
  vi.mocked(buildWorkbook).mockClear()
})

async function exportEvent(route, session) {
  const app = renderApp({ route, session })
  await screen.findByRole('heading', { level: 1 })
  await screen.findByRole('heading', { name: 'Intercambio' })
  const requests = recordRequests('/api/events')
  await app.user.click(screen.getByRole('button', { name: 'Exportar a Excel' }))
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1), { timeout: 8000 })
  return { ...app, requests }
}

const column = (header) => REPORT_COLUMNS.findIndex((c) => c.header === header)

describe('exportar un evento a Excel desde su detalle', () => {
  it('cliente: una hoja con una sola fila del evento, sin pedir nada más a la API', async () => {
    const { requests } = await exportEvent('/eventos/ev-acme-001', client)

    const [blob, name] = vi.mocked(downloadBlob).mock.calls[0]
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2} Acme Industrial Event \S+\.xlsx$/)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(requests).toHaveLength(0)

    const [sheets] = vi.mocked(buildWorkbook).mock.calls[0]
    expect(sheets).toHaveLength(1)
    expect(sheets[0].name).toBe('Crear cotización')
    expect(sheets[0].rows).toHaveLength(1)
    const [row] = sheets[0].rows
    expect(row[column('Estado')]).toBe('Con error')
    expect(row[column('Error / Motivo')]).toBe(
      'El artículo ITEM-0042 no existe en el sistema destino.',
    )
    expect(row[column('Id')]).toBe('ev-acme-001')
    expect(row[column('Recibido del CRM')]).not.toBe('')
    expect(await screen.findByText('Se exportó el evento.')).toBeInTheDocument()
  })

  it('Smarteam: el nombre lleva la empresa elegida', async () => {
    await exportEvent('/eventos/ev-globex-001?empresa=GLOBEX', staff)
    const [, name] = vi.mocked(downloadBlob).mock.calls[0]
    expect(name).toMatch(/ Globex Comercial Event \S+\.xlsx$/)
    const [sheets] = vi.mocked(buildWorkbook).mock.calls[0]
    expect(sheets[0].rows[0][column('Id')]).toBe('ev-globex-001')
  })
})
