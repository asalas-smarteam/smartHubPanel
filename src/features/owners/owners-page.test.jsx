import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { SEED_OWNER_MAPPINGS } from '@/mocks/seed-owner-mappings'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
const acme = SEED_OWNER_MAPPINGS.filter((o) => o.tenantKey === 'ACME')

async function openOwners(route = '/responsables', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Mapeo de responsables' })
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)
const tile = (label) => screen.getByRole('group', { name: label })
const rowWith = (table, text) => bodyRows(table).find((row) => row.textContent.includes(text))

describe('Mapeo de responsables', () => {
  it('cliente: menú, resumen, columnas y datos de su empresa', async () => {
    const requests = recordRequests('/api/owner-mappings')
    const { table } = await openOwners()
    expect(requests).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Mapeo de responsables' })).toBeInTheDocument()
    expect(tile('Responsables')).toHaveTextContent(String(acme.length))
    expect(tile('Activos')).toHaveTextContent(String(acme.filter((o) => o.active).length))
    expect(tile('Sin vendedor en el ERP')).toHaveTextContent('1')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual([
      'Responsable en el CRM',
      'ID en el CRM',
      'Corresponde a',
      'Vendedor en el ERP',
      'Empleado en el ERP (digitador)',
      'Estado',
      'Origen',
    ])
    expect(bodyRows(table)).toHaveLength(acme.length)

    const erick = rowWith(table, 'Erick Figueroa Pavón')
    expect(erick).toHaveTextContent('ventas8@acme.example')
    expect(erick).toHaveTextContent('53')
    expect(erick).toHaveTextContent('67')
    expect(erick).toHaveTextContent('Activo')
    expect(erick).toHaveTextContent('Carga inicial')
    expect(rowWith(table, 'Ana Mora')).toHaveTextContent('Ana Mora V.')
    expect(rowWith(table, 'Carla Rojas')).toHaveTextContent('Sin vendedor')
    expect(rowWith(table, 'soporte@acme.example')).toHaveTextContent('Manual')
    // Inactivos al final.
    expect(bodyRows(table).at(-1)).toHaveTextContent('Pedro Solís')
    expect(bodyRows(table).at(-1)).toHaveTextContent('Inactivo')
  })

  it('filtro de estado, en la URL', async () => {
    const { user, router, table } = await openOwners()
    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Inactivos' }))
    await waitFor(() => expect(bodyRows(table)).toHaveLength(1))
    expect(router.state.location.search).toContain('estado=inactivos')
  })

  it('busca por código del ERP desde la URL', async () => {
    const { table } = await openOwners('/responsables?q=67')
    await waitFor(() => expect(bodyRows(table)).toHaveLength(1))
    expect(bodyRows(table)[0]).toHaveTextContent('Erick Figueroa Pavón')
  })

  it('Smarteam elige la empresa; una empresa sin responsables muestra el estado vacío', async () => {
    renderApp({ route: '/responsables', session: staff })
    expect(
      await screen.findByText(/Elige una empresa para ver su mapeo de responsables/),
    ).toBeInTheDocument()
    const { table } = await openOwners('/responsables?empresa=GLOBEX', staff)
    expect(bodyRows(table)).toHaveLength(2)
    renderApp({ route: '/responsables?empresa=INITECH', session: staff })
    expect(
      await screen.findByText('Esta empresa todavía no tiene responsables mapeados'),
    ).toBeInTheDocument()
  })

  it('sin mappings.read: no hay menú y la ruta no se abre', async () => {
    getDb().users.find((user) => user.email === client).permissions = [
      'tickets.read',
      'events.read',
      'syncs.read',
    ]
    renderApp({ route: '/responsables', session: client })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mapeo de responsables' })).not.toBeInTheDocument()
  })
})
