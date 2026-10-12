import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/mocks/db'
import { DEMO_ACCOUNTS } from '@/mocks/seed'
import { server } from '@/mocks/server'

import { fetchSession } from './session'

describe('fetchSession', () => {
  it('sin sesión → anonymous', async () => {
    await expect(fetchSession()).resolves.toEqual({ status: 'anonymous' })
  })

  it('con sesión completa → authenticated con el usuario', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const session = await fetchSession()
    expect(session.status).toBe('authenticated')
    expect(session.user.email).toBe(DEMO_ACCOUNTS.smarteam.email)
  })

  it('con cambio pendiente (200 + mustChangePassword) → password_change_required', async () => {
    signInAs(DEMO_ACCOUNTS.clienteAdmin.email)
    const session = await fetchSession()
    expect(session).toMatchObject({
      status: 'password_change_required',
      user: { mustChangePassword: true },
    })
  })

  it('si /me responde 403 password_change_required (caso C1) → password_change_required', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ error: 'password_change_required' }, { status: 403 }),
      ),
    )
    await expect(fetchSession()).resolves.toEqual({ status: 'password_change_required' })
  })

  it('otros errores se propagan (la pantalla muestra el error)', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 500 })))
    await expect(fetchSession()).rejects.toMatchObject({ status: 500 })
  })
})
