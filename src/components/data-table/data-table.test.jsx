import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from './data-table'

const columns = [{ id: 'name', accessorKey: 'name', header: 'Nombre' }]
const items = (from, count) =>
  Array.from({ length: count }, (_, i) => ({ id: String(from + i), name: `Fila ${from + i}` }))

function renderTable(props) {
  const onPaginationChange = vi.fn()
  const utils = render(
    <DataTable
      label="Prueba"
      columns={columns}
      onPaginationChange={onPaginationChange}
      getRowId={(row) => row.id}
      {...props}
    />,
  )
  return { ...utils, onPaginationChange, user: userEvent.setup() }
}

describe('DataTable', () => {
  it('muestra filas, total y "Página X de Y" según el servidor', () => {
    renderTable({
      page: 1,
      pageSize: 10,
      data: { items: items(1, 10), page: 1, pageSize: 10, total: 42 },
    })
    const table = screen.getByRole('table', { name: 'Prueba' })
    expect(within(table).getAllByRole('row')).toHaveLength(11) // encabezado + 10
    expect(screen.getByText('42 resultados')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 5')).toBeInTheDocument()
  })

  it('en la primera página, "Anterior" y "Primera" están deshabilitadas', async () => {
    const { user, onPaginationChange } = renderTable({
      page: 1,
      pageSize: 10,
      data: { items: items(1, 10), page: 1, pageSize: 10, total: 42 },
    })
    expect(screen.getByRole('button', { name: 'Primera página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 })
    await user.click(screen.getByRole('button', { name: 'Última página' }))
    expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 5, pageSize: 10 })
  })

  it('en la última página, "Siguiente" y "Última" están deshabilitadas', () => {
    renderTable({
      page: 5,
      pageSize: 10,
      data: { items: items(41, 2), page: 5, pageSize: 10, total: 42 },
    })
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Última página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
  })

  it('cambiar las filas por página vuelve a la página 1', async () => {
    const { user, onPaginationChange } = renderTable({
      page: 3,
      pageSize: 10,
      data: { items: items(21, 10), page: 3, pageSize: 10, total: 42 },
    })
    await user.click(screen.getByRole('combobox', { name: 'Filas por página' }))
    await user.click(await screen.findByRole('option', { name: '50' }))
    expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 })
  })

  it('sin datos muestra el estado vacío', () => {
    renderTable({
      page: 1,
      pageSize: 10,
      data: { items: [], page: 1, pageSize: 10, total: 0 },
      emptyTitle: 'Nada por aquí',
    })
    expect(screen.getByText('Nada por aquí')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
  })

  it('con error y sin datos muestra el error y "Reintentar"', async () => {
    const onRetry = vi.fn()
    const { user } = renderTable({ page: 1, pageSize: 10, error: new Error('x'), onRetry })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
