import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openSyncs(route = '/syncs', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Syncs' })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)
const cells = (row) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

describe('Syncs', () => {
  it('lista las corridas con contadores; la que no terminó aparece "En curso"', async () => {
    const { table } = await openSyncs()
    expect(screen.getByText('30 resultados')).toBeInTheDocument()
    const [running] = bodyRows(table)
    expect(cells(running)[3]).toBe('En curso')
    expect(within(running).getByRole('link')).toHaveAttribute('href', '/syncs/sync-acme-030')

    const failedRow = bodyRows(table).find((row) => row.textContent.includes('Con error'))
    expect(failedRow).toBeDefined()
    const header = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)
    expect(header).toEqual([
      'Inicio',
      'Tarea',
      'Objeto',
      'Estado',
      'Procesados',
      'Enviados',
      'Fallidos',
      'Omitidos',
      'Duración',
    ])
    expect(cells(running)[8]).toBe('En curso')
  })

  it('filtros: tarea (de sync-tasks), estado y fechas llegan a la API y quedan en la URL', async () => {
    const requests = recordRequests('/api/syncs')
    const { user, router } = await openSyncs()

    await user.click(screen.getByRole('combobox', { name: 'Tarea' }))
    await user.click(await screen.findByRole('option', { name: 'Contactos' }))
    await waitFor(() =>
      expect(requests.at(-1).url.searchParams.get('taskId')).toBe('task-acme-contacts'),
    )

    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Completada' }))
    await waitFor(() => expect(requests.at(-1).url.searchParams.get('status')).toBe('completed'))

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } })
    await waitFor(() =>
      expect(requests.at(-1).url.searchParams.get('from')).toBe(new Date(2026, 9, 1).toISOString()),
    )
    expect(router.state.location.search).toBe(
      '?taskId=task-acme-contacts&status=completed&desde=2026-10-01',
    )
  })

  it('Smarteam: elige la empresa y ve sus tareas', async () => {
    const { user } = renderApp({ route: '/syncs', session: staff })
    expect(await screen.findByText('Elige una empresa para ver sus syncs')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Globex Comercial' }))
    await screen.findByText('12 resultados')
    await user.click(screen.getByRole('combobox', { name: 'Tarea' }))
    expect(await screen.findByRole('option', { name: 'Empresas' })).toBeInTheDocument()
  })
})
