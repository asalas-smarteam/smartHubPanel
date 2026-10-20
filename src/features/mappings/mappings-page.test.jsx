import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { SEED_MAPPINGS } from '@/mocks/seed-mappings'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
const acme = SEED_MAPPINGS.filter((m) => m.tenantKey === 'ACME')

async function openMappings(route = '/mapeos', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Mapeo de campos' })
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)
const tile = (label) => screen.getByRole('group', { name: label })

describe('Mapeo de campos', () => {
  it('cliente: lista de su empresa con resumen, columnas y nombres en español', async () => {
    const requests = recordRequests('/api/field-mappings')
    const { table } = await openMappings()
    expect(requests).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Mapeo de campos' })).toBeInTheDocument()
    expect(tile('Mapeos')).toHaveTextContent(String(acme.length))
    expect(tile('Inactivos')).toHaveTextContent(String(acme.filter((m) => !m.isActive).length))
    expect(tile('Editables')).toHaveTextContent(String(acme.filter((m) => m.editable).length))
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual([
      'Objeto',
      'Contexto',
      'Propiedad en el CRM',
      'Direccionalidad',
      'Campo en el ERP',
      'Estado',
      'Es un usuario',
      'Editable',
    ])
    expect(screen.getByText(`${acme.length} resultados`)).toBeInTheDocument()
  })

  it('una fila: propiedad → campo (solo del CRM al ERP), estado e indicadores', async () => {
    const { user } = await openMappings()
    await user.type(screen.getByLabelText('Buscar'), 'QuantityOnStock{Enter}')
    const table = await screen.findByRole('table', { name: 'Mapeo de campos' })
    await waitFor(() => expect(bodyRows(table)).toHaveLength(1))
    const cells = within(bodyRows(table)[0])
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells).toEqual([
      'Productos',
      'Producto',
      'quantity',
      'Del CRM al ERP',
      'QuantityOnStock',
      'Activo',
      'No',
      'No',
    ])
    expect(within(bodyRows(table)[0]).getByTitle('Del CRM al ERP')).toHaveClass('text-direction')
  })

  it('si se pide al ERP, la direccionalidad es en los dos sentidos (plan 4q)', async () => {
    await openMappings('/mapeos?q=ItemCode')
    const table = screen.getByRole('table', { name: 'Mapeo de campos' })
    const rows = bodyRows(table)
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByTitle('En los dos sentidos')).toBeInTheDocument()
    expect(within(rows[0]).getByText('En los dos sentidos')).toHaveClass('sr-only')
  })

  it('filtros por objeto, contexto y estado, en la URL', async () => {
    const { user, router, table } = await openMappings()
    await user.click(screen.getByRole('combobox', { name: 'Objeto' }))
    await user.click(await screen.findByRole('option', { name: 'Empresas' }))
    await waitFor(() => expect(router.state.location.search).toContain('objeto=company'))
    const companies = acme.filter((m) => m.objectType === 'company')
    await waitFor(() => expect(bodyRows(table)).toHaveLength(companies.length))

    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Inactivos' }))
    await waitFor(() =>
      expect(bodyRows(table)).toHaveLength(companies.filter((m) => !m.isActive).length),
    )
    expect(router.state.location.search).toContain('estado=inactivos')
  })

  it('un contexto que el front no conoce se muestra tal cual', async () => {
    await openMappings('/mapeos?contexto=creditNotes')
    const table = screen.getByRole('table', { name: 'Mapeo de campos' })
    expect(within(bodyRows(table)[0]).getByText('creditNotes')).toBeInTheDocument()
  })

  it('sin resultados con filtros: lo dice', async () => {
    await openMappings('/mapeos?q=no-existe')
    expect(screen.getByText('Ningún mapeo coincide con los filtros')).toBeInTheDocument()
  })

  it('Smarteam elige la empresa; una sin mapeos muestra el vacío', async () => {
    renderApp({ route: '/mapeos', session: staff })
    expect(
      await screen.findByText(/Elige una empresa para ver su mapeo de campos/),
    ).toBeInTheDocument()
    const requests = recordRequests('/api/staff/tenants/INITECH/field-mappings')
    const { table } = await openMappings('/mapeos?empresa=INITECH', staff)
    expect(requests.length).toBeGreaterThan(0)
    expect(bodyRows(table)).toHaveLength(1)
    expect(screen.getByText('Esta empresa todavía no tiene mapeos de campos')).toBeInTheDocument()
  })

  it('sin mappings.read: no hay menú y la ruta no se abre', async () => {
    getDb().users.find((user) => user.email === client).permissions = [
      'tickets.read',
      'events.read',
      'syncs.read',
    ]
    renderApp({ route: '/mapeos', session: client })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mapeo de campos' })).not.toBeInTheDocument()
  })
})
