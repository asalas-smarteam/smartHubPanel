import { screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

const { smarteam, clienteAdmin } = DEMO_ACCOUNTS

async function fillAndSubmit(user, { email, password }) {
  if (email) await user.type(screen.getByLabelText('Correo'), email)
  if (password) await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

/** Cuenta las llamadas a POST /api/auth/login sin alterar la respuesta del mock. */
function spyLoginRequests() {
  const calls = []
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname === '/api/auth/login') {
      calls.push(request.clone())
    }
  })
  return calls
}

describe('login', () => {
  it('valida en el cliente y no llama a la API', async () => {
    const calls = spyLoginRequests()
    const { user } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()

    await fillAndSubmit(user, { email: 'no-es-correo', password: 'x' })
    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('credenciales incorrectas → mensaje y sigue en /login', async () => {
    const { user, router } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, { email: smarteam.email, password: 'incorrecta' })
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('sexto intento fallido → "Demasiados intentos…"', async () => {
    const { user } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await user.type(screen.getByLabelText('Correo'), smarteam.email)
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    for (let i = 0; i < 6; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Entrar' }))
      await screen.findByRole('alert')
    }
    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument()
  })

  it('cuenta Smarteam → entra y queda en /usuarios', async () => {
    const { user, router } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, smarteam)
    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/usuarios')
  })

  it('cuenta con cambio pendiente → /cambiar-contrasena', async () => {
    const { user, router } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, clienteAdmin)
    expect(await screen.findByRole('heading', { name: 'Elige tu contraseña' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('vuelve a la ruta de origen después de entrar', async () => {
    const { user, router } = renderApp({ route: '/usuarios?page=2' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, smarteam)
    await screen.findByRole('heading', { name: 'Usuarios' })
    expect(router.state.location.pathname).toBe('/usuarios')
    expect(router.state.location.search).toBe('?page=2')
  })

  it('con sesión, /login redirige al inicio', async () => {
    const { router } = renderApp({ route: '/login', session: smarteam.email })
    await screen.findByRole('heading', { name: 'Usuarios' })
    expect(router.state.location.pathname).toBe('/usuarios')
  })

  it('el login manda X-Panel-Request: 1', async () => {
    const calls = spyLoginRequests()
    const { user } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, smarteam)
    await screen.findByRole('heading', { name: 'Usuarios' })
    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('X-Panel-Request')).toBe('1')
  })

  it('error de red → mensaje de conexión', async () => {
    server.use(http.post('/api/auth/login', () => Response.error()))
    const { user } = renderApp({ route: '/login' })
    await screen.findByRole('button', { name: 'Entrar' })
    await fillAndSubmit(user, smarteam)
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeInTheDocument()
  })
})
