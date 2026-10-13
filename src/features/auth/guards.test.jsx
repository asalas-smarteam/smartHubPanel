import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'

describe('guards de rutas', () => {
  it('sin sesión, una ruta privada lleva a /login', async () => {
    const { router } = renderApp({ route: '/usuarios' })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state).toEqual({ from: '/usuarios' })
  })

  it('con cambio pendiente, cualquier ruta privada lleva a /cambiar-contrasena', async () => {
    const { router } = renderApp({ route: '/', session: DEMO_ACCOUNTS.clienteAdmin.email })
    expect(await screen.findByRole('heading', { name: 'Elige tu contraseña' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('sin cambio pendiente, /cambiar-contrasena lleva al inicio', async () => {
    const { router } = renderApp({
      route: '/cambiar-contrasena',
      session: DEMO_ACCOUNTS.clienteUsuario.email,
    })
    expect(await screen.findByRole('heading', { name: 'Soporte' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/soporte')
  })

  it('el inicio lleva a la primera sección permitida', async () => {
    const { router } = renderApp({ route: '/', session: DEMO_ACCOUNTS.smarteam.email })
    expect(await screen.findByRole('heading', { name: 'Bandeja' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/bandeja')
  })

  it('una ruta inexistente muestra "Página no encontrada"', async () => {
    renderApp({ route: '/no-existe', session: DEMO_ACCOUNTS.smarteam.email })
    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument()
  })

  it('si /me falla con 500, muestra el error con "Reintentar"', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 500 })))
    renderApp({ route: '/' })
    expect(await screen.findByText('No pudimos conectar con el panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('sesión vencida en medio del uso → /login con aviso', async () => {
    const { router, queryClient } = renderApp({
      route: '/',
      session: DEMO_ACCOUNTS.clienteUsuario.email,
    })
    expect(await screen.findByRole('heading', { name: 'Soporte' })).toBeInTheDocument()

    server.use(
      http.get('/api/staff/tenants', () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 }),
      ),
    )
    await queryClient
      .fetchQuery({
        queryKey: ['cualquier-cosa'],
        queryFn: () =>
          import('@/lib/api/client').then(({ apiFetch }) => apiFetch('/staff/tenants')),
      })
      .catch(() => {})

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(await screen.findByText('Tu sesión expiró. Vuelve a entrar.')).toBeInTheDocument()
  })
})
