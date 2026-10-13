import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email // ACME
const staff = DEMO_ACCOUNTS.smarteam.email

async function openEvents(route = '/eventos', session = client) {
  const app = renderApp({ route, session })
  const table = await screen.findByRole('table', { name: 'Eventos' })
  await screen.findByText(/\d+ resultados?/)
  await waitFor(() => expect(table).not.toHaveAttribute('aria-busy'))
  return { ...app, table }
}

const bodyRows = (table) => within(table).getAllByRole('row').slice(1)

describe('Eventos: cliente', () => {
  it('lista los eventos de su empresa, del más reciente al más antiguo, con estado y reintentos', async () => {
    const requests = recordRequests('/api/events')
    const { table } = await openEvents()
    expect(screen.getByText('45 resultados')).toBeInTheDocument()
    expect(requests.at(-1).url.searchParams.get('page')).toBe('1')
    expect(screen.queryByRole('combobox', { name: 'Empresa' })).not.toBeInTheDocument()

    const first = bodyRows(table)[0]
    expect(within(first).getByRole('link', { name: /Crear cotización/ })).toHaveAttribute(
      'href',
      '/eventos/ev-acme-001',
    )
    expect(within(first).getByText('Con error')).toBeInTheDocument()
    expect(within(first).getByText('3/3')).toBeInTheDocument()
    const error = within(first).getByText(/ITEM-0042/)
    expect(error).toHaveAttribute('title', 'El artículo ITEM-0042 no existe en el sistema destino.')
  })

  it('filtros: estado y tipo con nombres de la API, vuelven a la página 1 y quedan en la URL', async () => {
    const requests = recordRequests('/api/events')
    const { user, router } = await openEvents('/eventos?page=2')
    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Creado en destino' }))
    await waitFor(() =>
      expect(requests.at(-1).url.searchParams.get('status')).toBe('destination_created'),
    )
    expect(requests.at(-1).url.searchParams.get('page')).toBe('1')

    await user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Actualizar cotización' }))
    await waitFor(() =>
      expect(requests.at(-1).url.searchParams.get('type')).toBe('updateQuotation'),
    )
    expect(router.state.location.search).toBe('?status=destination_created&type=updateQuotation')
  })

  it('referencia: se aplica con Enter; fechas: from/to en UTC desde la hora local (E3)', async () => {
    const requests = recordRequests('/api/events')
    const { user, router, table } = await openEvents()
    const reference = within(bodyRows(table)[0]).getAllByRole('cell')[2].textContent

    await user.type(screen.getByLabelText('Referencia'), `${reference}{Enter}`)
    await waitFor(() => expect(requests.at(-1).url.searchParams.get('reference')).toBe(reference))
    await waitFor(() =>
      expect(bodyRows(table).every((row) => row.textContent.includes(reference))).toBe(true),
    )

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-05' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-07' } })
    await waitFor(() => {
      const params = requests.at(-1).url.searchParams
      expect(params.get('from')).toBe(new Date(2026, 9, 5).toISOString())
      expect(params.get('to')).toBe(new Date(2026, 9, 8).toISOString())
    })
    expect(new URLSearchParams(router.state.location.search).get('desde')).toBe('2026-10-05')
  })
})

describe('Eventos: Smarteam', () => {
  it('sin empresa elegida muestra el selector y no pide eventos; al elegir, usa la ruta por empresa', async () => {
    const requests = recordRequests('/api/staff/tenants/INITECH/events')
    const { user, router } = renderApp({ route: '/eventos', session: staff })
    expect(await screen.findByText('Elige una empresa para ver sus eventos')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Eventos' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    // Las suspendidas también se pueden consultar.
    await user.click(await screen.findByRole('option', { name: 'Initech Servicios (suspendida)' }))
    await screen.findByText('8 resultados')
    expect(requests.length).toBeGreaterThan(0)
    expect(router.state.location.search).toBe('?empresa=INITECH')
    const table = screen.getByRole('table', { name: 'Eventos' })
    expect(
      within(bodyRows(table)[0]).getByRole('link', { name: /Crear cotización/ }),
    ).toHaveAttribute('href', '/eventos/ev-initech-001?empresa=INITECH')
  })

  it('cambiar de empresa vuelve a la página 1', async () => {
    const { user, router } = await openEvents('/eventos?empresa=ACME&page=2', staff)
    await user.click(screen.getByRole('combobox', { name: 'Empresa' }))
    await user.click(await screen.findByRole('option', { name: 'Globex Comercial' }))
    await screen.findByText('20 resultados')
    expect(router.state.location.search).toBe('?empresa=GLOBEX')
  })
})
