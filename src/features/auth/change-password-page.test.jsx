import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const { clienteAdmin, clienteUsuario } = DEMO_ACCOUNTS
const NEW_PASSWORD = 'Mi-clave-nueva-2026'

async function openChangePassword() {
  const app = renderApp({ route: '/', session: clienteAdmin.email })
  await screen.findByRole('heading', { name: 'Elige tu contraseña' })
  return app
}

async function fill(user, { current, next, confirm = next }) {
  if (current) await user.type(screen.getByLabelText('Contraseña actual'), current)
  if (next) await user.type(screen.getByLabelText('Contraseña nueva'), next)
  if (confirm) await user.type(screen.getByLabelText('Repite la contraseña nueva'), confirm)
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('cambio de contraseña obligatorio', () => {
  it('bloquea el resto del panel hasta cambiarla', async () => {
    const { router } = renderApp({ route: '/usuarios', session: clienteAdmin.email })
    await screen.findByRole('heading', { name: 'Elige tu contraseña' })
    expect(router.state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('valida largo, confirmación y que sea distinta, sin llamar a la API', async () => {
    let calls = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname === '/api/auth/change-password') calls += 1
    })
    const { user } = await openChangePassword()

    await fill(user, { current: clienteAdmin.password, next: 'corta' })
    expect(await screen.findByText('Debe tener al menos 10 caracteres.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Contraseña nueva'))
    await user.clear(screen.getByLabelText('Repite la contraseña nueva'))
    await fill(user, { next: NEW_PASSWORD, confirm: 'Otra-clave-distinta' })
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Contraseña nueva'))
    await user.clear(screen.getByLabelText('Repite la contraseña nueva'))
    await fill(user, { next: clienteAdmin.password })
    expect(
      await screen.findByText('La contraseña nueva debe ser distinta de la actual.'),
    ).toBeInTheDocument()

    expect(calls).toBe(0)
  })

  it('contraseña actual incorrecta → error en ese campo y sigue la sesión', async () => {
    const { user, router } = await openChangePassword()
    await fill(user, { current: 'no-es-la-actual', next: NEW_PASSWORD })
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('éxito → entra al panel (el cliente cae en el Inicio)', async () => {
    const { user, router } = await openChangePassword()
    await fill(user, { current: clienteAdmin.password, next: NEW_PASSWORD })
    expect(
      await screen.findByRole('heading', { name: 'Estado de la integración' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inicio')
    expect(await screen.findByText('Contraseña actualizada.')).toBeInTheDocument()
  })

  it('si el backend cierra la sesión al cambiarla (caso C3) → /login con aviso', async () => {
    const { user, router } = await openChangePassword()
    server.use(
      http.post('/api/auth/change-password', () => new HttpResponse(null, { status: 204 })),
      http.get('/api/auth/me', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    await fill(user, { current: clienteAdmin.password, next: NEW_PASSWORD })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(await screen.findByText('Contraseña cambiada. Vuelve a entrar.')).toBeInTheDocument()
  })

  it('si /me responde 403 password_change_required (caso C1), igual muestra esta pantalla', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ error: 'password_change_required' }, { status: 403 }),
      ),
    )
    const { router } = renderApp({ route: '/usuarios' })
    await screen.findByRole('heading', { name: 'Elige tu contraseña' })
    expect(router.state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('sin cambio pendiente, /cambiar-contrasena lleva al inicio', async () => {
    const { router } = renderApp({ route: '/cambiar-contrasena', session: clienteUsuario.email })
    await screen.findByRole('heading', { name: 'Estado de la integración' })
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('"Cerrar sesión" lleva a /login', async () => {
    const { user, router } = await openChangePassword()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})
