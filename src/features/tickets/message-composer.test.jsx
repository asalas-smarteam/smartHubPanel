import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'
import { makeImageFile } from '@/test/files'

import { MessageComposer } from './message-composer'

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup()
  render(<MessageComposer onSubmit={onSubmit} />)
  return { user, onSubmit, textbox: screen.getByLabelText('Tu respuesta') }
}

function paste(target, files) {
  const event = createEvent.paste(target, { clipboardData: { files, items: [] } })
  fireEvent(target, event)
}

describe('MessageComposer', () => {
  it('no envía un mensaje vacío', async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Escribe un mensaje.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía el texto y las imágenes, y después se limpia', async () => {
    const { user, onSubmit, textbox } = setup()
    await user.type(textbox, 'Adjunto la captura')
    await user.upload(
      screen.getByLabelText('Adjuntar imágenes'),
      makeImageFile('png', { name: 'a.png' }),
    )
    expect(await screen.findByRole('img', { name: 'a.png' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const { body, images } = onSubmit.mock.calls[0][0]
    expect(body).toBe('Adjunto la captura')
    expect(images.map((file) => file.name)).toEqual(['a.png'])
    await waitFor(() => expect(textbox).toHaveValue(''))
    expect(screen.queryByRole('img', { name: 'a.png' })).not.toBeInTheDocument()
  })

  it('pegar una imagen con Ctrl+V la agrega; "Quitar" la saca', async () => {
    const { user, textbox } = setup()
    paste(textbox, [makeImageFile('jpeg', { name: 'pegada.jpg' })])
    const list = await screen.findByRole('list', { name: 'Imágenes a enviar' })
    expect(within(list).getByRole('img', { name: 'pegada.jpg' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar pegada.jpg' }))
    expect(screen.queryByRole('list', { name: 'Imágenes a enviar' })).not.toBeInTheDocument()
  })

  it('rechaza archivos inválidos con un mensaje por archivo', async () => {
    const { user } = setup()
    await user.upload(screen.getByLabelText('Adjuntar imágenes'), [
      makeImageFile('svg', { name: 'truco.png', type: 'image/png' }),
      makeImageFile('png', { name: 'grande.png', size: 5 * 1024 * 1024 + 10 }),
    ])
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/truco\.png: solo se aceptan/)).toBeInTheDocument()
    expect(within(alert).getByText(/grande\.png: pesa/)).toBeInTheDocument()
  })

  it('no deja pasar de 5 imágenes', async () => {
    const { user } = setup()
    const files = Array.from({ length: 6 }, (_, i) => makeImageFile('png', { name: `f${i}.png` }))
    await user.upload(screen.getByLabelText('Adjuntar imágenes'), files)
    expect(await screen.findByText('f5.png: máximo 5 imágenes por mensaje.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Imágenes a enviar' })).getAllByRole('img'),
    ).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
  })

  it('muestra el error del servidor y conserva lo escrito', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError({ status: 413, code: 'image_too_large' }))
    const { user, textbox } = setup(onSubmit)
    await user.type(textbox, 'Hola')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Cada imagen puede pesar como máximo 5 MB.')).toBeInTheDocument()
    expect(textbox).toHaveValue('Hola')
  })
})
