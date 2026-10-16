// Ajustes por datos del backend real (revisión con la cuenta de Printer, 13-10-2026):
// el front tolera nulos que el backend puede mandar, topa la paginación en la ventana de
// 10 000 resultados e ignora filtros desconocidos de la URL (el backend responde 400).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from '@/components/data-table/data-table'
import { syncPageSchema } from '@/features/syncs/schemas'
import { ticketDetailSchema, staffTicketDetailSchema } from '@/features/tickets/schemas'
import { createUserSchema } from '@/features/users/schemas'
import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email
const staff = DEMO_ACCOUNTS.smarteam.email

const sync = (overrides = {}) => ({
  id: '6acf0854e4aec65d20a801fe',
  task: null,
  objectType: 'deal',
  status: 'completed',
  counts: { processed: 0, sent: 0, failed: 0, updated: 0, skipped: 0 },
  skippedReasons: [],
  errorMessage: null,
  startedAt: '2026-10-13T20:00:00.000Z',
  finishedAt: '2026-10-13T20:00:01.000Z',
  ...overrides,
})

const event = (overrides = {}) => ({
  id: 'ev-1',
  type: 'purchaseQuotation',
  status: null,
  retries: 0,
  maxRetries: 3,
  lastError: null,
  reference: '1',
  createdAt: '2026-10-13T20:00:00.000Z',
  updatedAt: '2026-10-13T20:00:01.000Z',
  ...overrides,
})

describe('corridas sin tarea (task: null)', () => {
  it('el esquema las acepta', () => {
    expect(() =>
      syncPageSchema.parse({ items: [sync()], page: 1, pageSize: 25, total: 1 }),
    ).not.toThrow()
  })

  it('la lista y el detalle muestran "Tarea no disponible"', async () => {
    server.use(
      http.get('/api/syncs', () =>
        HttpResponse.json({ items: [sync()], page: 1, pageSize: 25, total: 1 }),
      ),
      http.get('/api/syncs/:id', () =>
        HttpResponse.json({ ...sync(), errors: { items: [], page: 1, pageSize: 25, total: 0 } }),
      ),
    )
    renderApp({ route: '/syncs', session: client })
    const table = await screen.findByRole('table', { name: 'Syncs' })
    expect(await within(table).findByText('Tarea no disponible')).toBeInTheDocument()

    renderApp({ route: '/syncs/6acf0854e4aec65d20a801fe', session: client })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tarea no disponible' }),
    ).toBeInTheDocument()
  })
})

describe('eventos con un estado que el backend aún no traduce (status: null)', () => {
  it('se listan con la insignia "Desconocido"', async () => {
    server.use(
      http.get('/api/events', () =>
        HttpResponse.json({ items: [event()], page: 1, pageSize: 25, total: 1 }),
      ),
    )
    renderApp({ route: '/eventos', session: client })
    const table = await screen.findByRole('table', { name: 'Eventos' })
    expect(await within(table).findByText('Desconocido')).toBeInTheDocument()
  })
})

describe('nombres que faltan en los tickets', () => {
  it('se muestran como "Sin nombre" en vez de romper la pantalla', () => {
    const ticket = staffTicketDetailSchema.parse({
      id: 't1',
      code: 'PRINTER-0001',
      title: 'x',
      category: 'otro',
      status: 'resuelto',
      createdBy: { name: null, role: null },
      openedAt: '2026-10-13T20:00:00.000Z',
      lastActivityAt: '2026-10-13T20:00:00.000Z',
      resolvedAt: null,
      reopenCount: 0,
      hasNews: false,
      contextType: null,
      description: 'x',
      attachments: [],
      firstResponseAt: null,
      context: null,
      messages: [
        {
          id: 'm1',
          authorType: 'smarteam',
          authorName: null,
          body: 'hola',
          attachments: [],
          createdAt: '2026-10-13T20:00:00.000Z',
        },
      ],
      statusHistory: [
        {
          from: null,
          to: 'abierto',
          byType: 'cliente',
          byName: null,
          at: '2026-10-13T20:00:00.000Z',
        },
      ],
      tenantKey: 'sap_integration_printer',
      companyName: 'Printer',
      internalResolution: {
        text: 'nota',
        updatedAt: '2026-10-13T20:00:00.000Z',
        updatedBy: { name: null },
      },
    })
    expect(ticket.createdBy.name).toBe('Sin nombre')
    expect(ticket.messages[0].authorName).toBe('Sin nombre')
    expect(ticket.statusHistory[0].byName).toBe('Sin nombre')
    expect(ticket.internalResolution.updatedBy.name).toBe('Sin nombre')
    expect(ticketDetailSchema.shape.createdBy).toBeDefined()
  })
})

describe('ventana de 10 000 resultados', () => {
  const columns = [{ id: 'name', accessorKey: 'name', header: 'Nombre' }]
  const items = Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Fila ${i}` }))

  it('la paginación no pasa de la ventana y avisa cómo ver lo más antiguo', async () => {
    const onPaginationChange = vi.fn()
    render(
      <DataTable
        label="Corridas"
        columns={columns}
        page={1}
        pageSize={100}
        data={{ items, page: 1, pageSize: 100, total: 55536 }}
        onPaginationChange={onPaginationChange}
        getRowId={(row) => row.id}
        maxResults={10000}
        windowHint="Para ver registros más antiguos, filtra por fechas."
      />,
    )
    expect(screen.getByText('55.536 resultados')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 100')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Se pueden recorrer los primeros 10.000. Para ver registros más antiguos, filtra por fechas.',
      ),
    ).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Última página' }))
    expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 100, pageSize: 100 })
  })

  it('sin pasar la ventana no muestra el aviso', () => {
    render(
      <DataTable
        label="Corridas"
        columns={columns}
        page={1}
        pageSize={100}
        data={{ items, page: 1, pageSize: 100, total: 120 }}
        onPaginationChange={() => {}}
        maxResults={10000}
        windowHint="Para ver registros más antiguos, filtra por fechas."
      />,
    )
    expect(screen.queryByText(/Se pueden recorrer/)).not.toBeInTheDocument()
  })
})

describe('filtros desconocidos en la URL no llegan a la API', () => {
  it.each([
    ['Soporte', '/soporte?status=xyz&category=abc', '/api/tickets', client, ['status', 'category']],
    [
      'Bandeja',
      '/bandeja?status=xyz&category=abc',
      '/api/staff/tickets',
      staff,
      ['status', 'category'],
    ],
    ['Eventos', '/eventos?status=xyz', '/api/events', client, ['status']],
    ['Syncs', '/syncs?status=xyz&taskId=no-es-un-id', '/api/syncs', client, ['status', 'taskId']],
  ])('%s', async (_, route, path, session, params) => {
    const requests = recordRequests(path)
    renderApp({ route, session })
    await waitFor(() => expect(requests.length).toBeGreaterThan(0))
    for (const param of params) {
      expect(requests.at(-1).url.searchParams.has(param)).toBe(false)
    }
  })
})

describe('usuarios', () => {
  it('el nombre tiene como máximo 100 caracteres, como en el backend', () => {
    const result = createUserSchema.safeParse({
      accountType: 'smarteam',
      email: 'a@b.com',
      name: 'x'.repeat(101),
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('Máximo 100 caracteres.')
    expect(
      createUserSchema.safeParse({
        accountType: 'smarteam',
        email: 'a@b.com',
        name: 'x'.repeat(100),
      }).success,
    ).toBe(true)
  })
})

describe('Smarteam ve el nombre de la empresa, no su clave interna', () => {
  it.each([
    ['evento', '/eventos/ev-acme-001?empresa=ACME', 'Último error'],
    ['corrida', '/syncs/sync-acme-001?empresa=ACME', 'Errores'],
  ])('detalle de %s', async (_, route, ready) => {
    renderApp({ route, session: staff })
    await screen.findAllByText(ready)
    expect(await screen.findByText('Empresa Acme Industrial')).toBeInTheDocument()
    expect(screen.queryByText('Empresa ACME')).not.toBeInTheDocument()
  })
})
