import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getDb } from '@/mocks/db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const { smarteam, clienteUsuario } = DEMO_ACCOUNTS
const NEW_PASSWORD = 'Smarteam-nueva-2026'

async function fill(user, { current, next, confirm = next }) {
  if (current) await user.type(screen.getByLabelText('Contraseña actual'), current)
  if (next) await user.type(screen.getByLabelText('Contraseña nueva'), next)
  if (confirm) await user.type(screen.getByLabelText('Repite la contraseña nueva'), confirm)
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('cambio de contraseña de Smarteam (plan 4s)', () => {
  it('Smarteam: el botón de la barra abre la página y cambia la contraseña', async () => {
    const requests = recordRequests('/api/auth/change-password', 'POST')
    const { user, router } = renderApp({ route: '/bandeja', session: smarteam.email })
    await user.click(await screen.findByRole('link', { name: 'Cambiar contraseña' }))
    expect(router.state.location.pathname).toBe('/cuenta/contrasena')
    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument()

    await fill(user, { current: smarteam.password, next: NEW_PASSWORD })
    expect(
      await screen.findByText('Contraseña actualizada. Tus otras sesiones se cerraron.'),
    ).toBeInTheDocument()
    expect(requests).toHaveLength(1)
    const stored = getDb().users.find((u) => u.email === smarteam.email)
    expect(stored.password).toBe(NEW_PASSWORD)
    // La sesión sigue abierta y el formulario queda vacío.
    expect(router.state.location.pathname).toBe('/cuenta/contrasena')
    await waitFor(() => expect(screen.getByLabelText('Contraseña actual')).toHaveValue(''))
  })

  it('contraseña actual incorrecta: lo dice en el campo y no cambia nada', async () => {
    const { user } = renderApp({ route: '/cuenta/contrasena', session: smarteam.email })
    await screen.findByRole('heading', { name: 'Cambiar contraseña' })
    await fill(user, { current: 'no-es-esta-clave', next: NEW_PASSWORD })
    expect(await screen.findByLabelText('Contraseña actual')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(getDb().users.find((u) => u.email === smarteam.email).password).toBe(smarteam.password)
  })

  it('cliente: sin botón en la barra y sin acceso a la página', async () => {
    renderApp({ route: '/cuenta/contrasena', session: clienteUsuario.email })
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Cambiar contraseña' })).not.toBeInTheDocument()
  })
})
