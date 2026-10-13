import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { makeImageFile } from '@/test/files'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const client = DEMO_ACCOUNTS.clienteUsuario.email

/** Registra los POST a /api/tickets con su multipart. */
function recordCreates() {
  const creates = []
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname === '/api/tickets') {
      const form = await request.clone().formData()
      creates.push({ headers: request.headers, form })
    }
  })
  return creates
}

async function openForm(route = '/soporte/nuevo') {
  const app = renderApp({ route, session: client })
  await screen.findByRole('heading', { name: 'Nuevo ticket' })
  return app
}

async function fill(
  user,
  { title = 'No llegó la cotización', category = 'Documentos', description = 'Detalle' } = {},
) {
  if (title) await user.type(screen.getByLabelText('Título'), title)
  if (category) {
    await user.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await user.click(await screen.findByRole('option', { name: category }))
  }
  if (description) await user.type(screen.getByLabelText('Descripción'), description)
}

describe('Nuevo ticket', () => {
  it('título, categoría y descripción son obligatorios', async () => {
    const creates = recordCreates()
    const { user } = await openForm()
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    expect(await screen.findByText('Escribe un título.')).toBeInTheDocument()
    expect(screen.getByText('Elige una categoría.')).toBeInTheDocument()
    expect(screen.getByText('Cuéntanos qué pasó.')).toBeInTheDocument()
    expect(creates).toHaveLength(0)
  })

  it('crea con imágenes (botón y Ctrl+V), avisa el código y abre el detalle', async () => {
    const creates = recordCreates()
    const { user, router } = await openForm()
    await fill(user)
    await user.upload(
      screen.getByLabelText('Adjuntar imágenes'),
      makeImageFile('png', { name: 'a.png' }),
    )
    const description = screen.getByLabelText('Descripción')
    fireEvent(
      description,
      createEvent.paste(description, {
        clipboardData: { files: [makeImageFile('jpeg', { name: 'b.jpg' })] },
      }),
    )
    const previews = await screen.findByRole('list', { name: 'Imágenes a enviar' })
    await waitFor(() => expect(within(previews).getAllByRole('img')).toHaveLength(2))

    const expectedCode = `ACME-${String(getDb().ticketCounters.ACME + 1).padStart(4, '0')}`
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    expect(
      await screen.findByRole('heading', { name: 'No llegó la cotización' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/soporte\/t-acme-/)
    expect(await screen.findByText(`Ticket ${expectedCode} creado.`)).toBeInTheDocument()

    await waitFor(() => expect(creates).toHaveLength(1))
    const { headers, form } = creates[0]
    expect(headers.get('X-Panel-Request')).toBe('1')
    expect(form.get('title')).toBe('No llegó la cotización')
    expect(form.get('category')).toBe('documentos')
    expect(form.get('description')).toBe('Detalle')
    expect(form.getAll('images')).toHaveLength(2)
    expect(form.get('contextType')).toBeNull()
  })

  it('las imágenes inválidas se rechazan antes de enviar', async () => {
    const { user } = await openForm()
    await user.upload(screen.getByLabelText('Adjuntar imágenes'), [
      // Se declara como PNG para pasar el filtro del selector de archivos: lo frena la validación.
      makeImageFile('svg', { name: 'logo.svg', type: 'image/png' }),
      makeImageFile('png', { name: 'enorme.png', size: 6 * 1024 * 1024 }),
    ])
    expect(await screen.findByText(/logo\.svg: solo se aceptan/)).toBeInTheDocument()
    expect(screen.getByText(/enorme\.png: pesa/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Imágenes a enviar' })).not.toBeInTheDocument()
  })

  it('con ?contexto=evento&id=… envía el contexto', async () => {
    const creates = recordCreates()
    const { user } = await openForm('/soporte/nuevo?contexto=evento&id=ev-acme-001')
    expect(screen.getByText(/Se enlazará el evento/)).toBeInTheDocument()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    await screen.findByRole('heading', { name: 'No llegó la cotización' })
    await waitFor(() => expect(creates).toHaveLength(1))
    expect(creates[0].form.get('contextType')).toBe('webhookEvent')
    expect(creates[0].form.get('contextId')).toBe('ev-acme-001')
    expect(await screen.findByText(/Evento enlazado/)).toBeInTheDocument()
  })

  it('si el contexto no es de su empresa, lo avisa y deja crear sin él', async () => {
    const { user } = await openForm('/soporte/nuevo?contexto=evento&id=ev-globex-001')
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    expect(await screen.findByText(/No encontramos ese evento en tu empresa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear sin enlazarlo' }))
    expect(screen.queryByText(/Se enlazará el evento/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }))
    expect(
      await screen.findByRole('heading', { name: 'No llegó la cotización' }),
    ).toBeInTheDocument()
  })
})
