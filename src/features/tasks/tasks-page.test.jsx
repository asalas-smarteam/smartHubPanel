import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { SEED_SCHEDULED_TASKS } from '@/mocks/seed-scheduled-tasks'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email
const acme = SEED_SCHEDULED_TASKS.filter((task) => task.tenantKey === 'ACME')
const products = acme.find((task) => task.name === 'Productos')
const contacts = acme.find((task) => task.name === 'Contactos')

async function openTasks(route = '/tareas', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Tareas programadas' })
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)
const rowOf = (table, name) =>
  bodyRows(table).find((row) => within(row).queryByRole('link', { name }))

describe('Tareas programadas', () => {
  it('cliente: lista con resumen, horario en texto y zona horaria', async () => {
    const requests = recordRequests('/api/scheduled-tasks')
    const { table } = await openTasks()
    expect(requests).toHaveLength(1)
    expect(screen.getByText(/horas en hora de Costa Rica/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Tareas' })).toHaveTextContent(String(acme.length))
    expect(screen.getByRole('group', { name: 'Con error' })).toHaveTextContent('1')
    // Activas primero.
    expect(bodyRows(table).map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      'Contactos',
      'Productos',
      'Opciones de listas',
    ])
    // Horario y días en columnas separadas.
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(headers.slice(4, 6)).toEqual(['Horario', 'Días'])
    const row = rowOf(table, 'Productos')
    const cells = within(row)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells.slice(4, 6)).toEqual(['07:00, 12:00 y 15:00', 'lun a sáb'])
    expect(row).toHaveTextContent('Completa')
    expect(row).toHaveTextContent('Activa')
    expect(rowOf(table, 'Contactos')).toHaveTextContent('Con error')
    expect(rowOf(table, 'Contactos')).toHaveTextContent('Cada 2 min, de 08:00 a 18:00')
    expect(rowOf(table, 'Contactos')).toHaveTextContent('todos los días')
  })

  it('"Ver corridas" lleva a Syncs filtrado por la tarea', async () => {
    const { user, router, table } = await openTasks()
    await user.click(within(rowOf(table, 'Productos')).getByRole('link', { name: 'Ver corridas' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/syncs'))
    expect(router.state.location.search).toBe(`?taskId=${products.id}`)
  })

  it('filtro por estado y tipo, en la URL', async () => {
    const { user, router, table } = await openTasks()
    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Inactivas' }))
    await waitFor(() => expect(bodyRows(table)).toHaveLength(1))
    expect(router.state.location.search).toContain('estado=inactivas')
    await user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Sincronización de registros' }))
    expect(await screen.findByText('Ninguna tarea coincide con los filtros')).toBeInTheDocument()
  })

  it('detalle: datos, horario, último error, filtros y orden', async () => {
    const { user, table } = await openTasks()
    await user.click(within(rowOf(table, 'Contactos')).getByRole('link', { name: 'Contactos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Contactos' })).toBeInTheDocument()
    expect(screen.getByText('/BusinessPartners')).toBeInTheDocument()
    const horario = screen.getByRole('region', { name: 'Horario' })
    expect(horario).toHaveTextContent('Cada 2 min, de 08:00 a 18:00')
    expect(horario).toHaveTextContent('todos los días')
    expect(horario).toHaveTextContent('hora de Costa Rica')
    expect(screen.getByRole('region', { name: 'Último error' })).toHaveTextContent(
      contacts.lastError,
    )
    const filters = screen.getByRole('table', { name: 'Filtros de la tarea' })
    const rows = within(filters).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('CardTypeigual aC')
    expect(rows[1]).toHaveTextContent('Calculado al correr')
    expect(rows[1]).toHaveTextContent('Sí · Fecha y hora')
    expect(screen.getByRole('region', { name: 'Orden' })).toHaveTextContent(
      'UpdateDate · descendente',
    )
    expect(screen.getByRole('link', { name: 'Ver corridas' })).toHaveAttribute(
      'href',
      `/syncs?taskId=${contacts.id}`,
    )
  })

  it('detalle con filtro "es uno de" y sin orden', async () => {
    renderApp({ route: `/tareas/${products.id}`, session: client })
    const filters = await screen.findByRole('table', { name: 'Filtros de la tarea' })
    expect(filters).toHaveTextContent('es uno de')
    expect(filters).toHaveTextContent('101, 102, 105, 106, 107, 108')
    expect(screen.getByText('Sin orden definido.')).toBeInTheDocument()
  })

  it('una tarea que no está en la lista: "No encontramos esa tarea"', async () => {
    renderApp({ route: '/tareas/no-existe', session: client })
    expect(await screen.findByText('No encontramos esa tarea')).toBeInTheDocument()
  })

  it('Smarteam elige la empresa y los enlaces llevan ?empresa=', async () => {
    renderApp({ route: '/tareas', session: staff })
    expect(
      await screen.findByText(/Elige una empresa para ver sus tareas programadas/),
    ).toBeInTheDocument()
    const { table } = await openTasks('/tareas?empresa=GLOBEX', staff)
    expect(bodyRows(table)).toHaveLength(2)
    const link = within(rowOf(table, 'Productos')).getByRole('link', { name: 'Ver corridas' })
    expect(link.getAttribute('href')).toMatch(/^\/syncs\?empresa=GLOBEX&taskId=/)
  })

  it('sin tasks.read: no hay menú y la ruta no se abre', async () => {
    getDb().users.find((user) => user.email === client).permissions = [
      'tickets.read',
      'events.read',
      'syncs.read',
    ]
    renderApp({ route: '/tareas', session: client })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tareas programadas' })).not.toBeInTheDocument()
  })
})
