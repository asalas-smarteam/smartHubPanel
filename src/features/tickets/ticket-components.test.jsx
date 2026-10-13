import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { TicketContext } from './ticket-context'
import { TicketThread } from './ticket-thread'
import { TicketTimeline } from './ticket-timeline'

const urlFor = (fileId) => `/api/tickets/t1/attachments/${fileId}`

const ticket = {
  id: 't1',
  createdBy: { name: 'Mario Quesada' },
  openedAt: '2026-10-10T14:00:00.000Z',
  description: 'No llegó la cotización',
  attachments: [{ fileId: 'f1', filename: 'captura.png', contentType: 'image/png', size: 10 }],
  messages: [
    {
      id: 'm1',
      authorType: 'smarteam',
      authorName: 'Ana Dev',
      body: 'Lo revisamos',
      attachments: [],
      createdAt: '2026-10-10T15:00:00.000Z',
    },
    {
      id: 'm2',
      authorType: 'cliente',
      authorName: 'Mario Quesada',
      body: 'Gracias',
      attachments: [{ fileId: 'f2', filename: 'error.png', contentType: 'image/png', size: 10 }],
      createdAt: '2026-10-10T16:00:00.000Z',
    },
  ],
  firstResponseAt: '2026-10-10T15:00:00.000Z',
  reopenCount: 1,
  statusHistory: [
    {
      from: null,
      to: 'abierto',
      byType: 'cliente',
      byName: 'Mario Quesada',
      at: '2026-10-10T14:00:00.000Z',
    },
    {
      from: 'abierto',
      to: 'en_progreso',
      byType: 'smarteam',
      byName: 'Ana Dev',
      at: '2026-10-10T15:00:00.000Z',
    },
    {
      from: 'en_progreso',
      to: 'resuelto',
      byType: 'smarteam',
      byName: 'Ana Dev',
      at: '2026-10-10T17:00:00.000Z',
    },
    {
      from: 'resuelto',
      to: 'abierto',
      byType: 'cliente',
      byName: 'Mario Quesada',
      at: '2026-10-10T18:00:00.000Z',
    },
  ],
}

describe('TicketThread', () => {
  it('muestra la descripción y los mensajes; los de Smarteam con su etiqueta', () => {
    render(<TicketThread ticket={ticket} urlFor={urlFor} />)
    const description = screen.getByRole('article', { name: 'Descripción del ticket' })
    expect(within(description).getByText('No llegó la cotización')).toBeInTheDocument()
    const staff = screen.getByRole('article', { name: 'Mensaje de Ana Dev' })
    expect(within(staff).getByText('Smarteam')).toBeInTheDocument()
    const client = screen.getByRole('article', { name: 'Mensaje de Mario Quesada' })
    expect(within(client).queryByText('Smarteam')).not.toBeInTheDocument()
  })

  it('las imágenes usan la URL del ticket y se abren en grande', async () => {
    const user = userEvent.setup()
    render(<TicketThread ticket={ticket} urlFor={urlFor} />)
    expect(screen.getByRole('img', { name: 'captura.png' })).toHaveAttribute('src', urlFor('f1'))
    await user.click(screen.getByRole('button', { name: 'Ver error.png' }))
    const dialog = await screen.findByRole('dialog', { name: 'error.png' })
    expect(within(dialog).getByRole('img', { name: 'error.png' })).toHaveAttribute(
      'src',
      urlFor('f2'),
    )
  })
})

describe('TicketTimeline', () => {
  it('lista apertura, primera respuesta, resolución, reapertura y el contador', () => {
    render(<TicketTimeline ticket={ticket} />)
    const items = within(screen.getByRole('list'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items[0]).toMatch(/^Abierto por Mario Quesada/)
    expect(items.some((text) => text.startsWith('Primera respuesta de Smarteam'))).toBe(true)
    expect(items.some((text) => text.startsWith('Resuelto por Ana Dev'))).toBe(true)
    expect(items.at(-1)).toMatch(/^Reabierto por Mario Quesada/)
    expect(screen.getByText(/Reaperturas:/)).toHaveTextContent('Reaperturas: 1')
  })
})

describe('TicketContext', () => {
  it('muestra el registro enlazado con el visor JSON', () => {
    render(
      <TicketContext
        context={{
          type: 'webhookEvent',
          refId: 'ev-1',
          snapshot: { status: 'errored', lastError: 'Fallo' },
        }}
      />,
    )
    expect(screen.getByText(/Evento enlazado/)).toBeInTheDocument()
    expect(screen.getByText('ev-1')).toBeInTheDocument()
    expect(screen.getByText(/errored/)).toBeInTheDocument()
  })

  it('sin contexto no muestra nada', () => {
    const { container } = render(<TicketContext context={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
