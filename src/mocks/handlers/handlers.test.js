import { describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'

const { smarteam, clienteAdmin, clienteUsuario } = DEMO_ACCOUNTS
const login = (account) =>
  apiFetch('/auth/login', {
    method: 'POST',
    json: { email: account.email, password: account.password },
  })
const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )

describe('mocks: auth', () => {
  it('sin sesión, /auth/me da 401', async () => {
    expect(await fail(apiFetch('/auth/me'))).toMatchObject({ status: 401, code: 'unauthorized' })
  })

  it('login correcto devuelve el cuerpo de /me con permisos', async () => {
    const me = await login(smarteam)
    expect(me).toMatchObject({ email: smarteam.email, accountType: 'smarteam' })
    expect(me.permissions).toContain('staff.users')
    expect(await apiFetch('/auth/me')).toEqual(me)
  })

  it('una mutación sin X-Panel-Request da 403 missing_panel_header', async () => {
    const response = await fetch(new URL('/api/auth/login', window.location.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smarteam),
    })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'missing_panel_header' })
  })

  it('bloquea el sexto intento tras 5 fallidos, aunque la contraseña sea correcta', async () => {
    for (let i = 0; i < 5; i += 1) {
      const error = await fail(login({ ...smarteam, password: 'incorrecta' }))
      expect(error).toMatchObject({ status: 401, code: 'invalid_credentials' })
    }
    expect(await fail(login(smarteam))).toMatchObject({ status: 429, code: 'too_many_attempts' })
  })

  it('con cambio pendiente: /me responde 200 y el resto 403 password_change_required', async () => {
    const me = await login(clienteAdmin)
    expect(me.mustChangePassword).toBe(true)
    signInAs(smarteam.email)
    signInAs(clienteAdmin.email)
    expect(await fail(apiFetch('/staff/tenants'))).toMatchObject({
      status: 403,
      code: 'password_change_required',
    })
  })

  it('cambio de contraseña: reglas y sesión renovada', async () => {
    await login(clienteAdmin)
    const change = (json) => fail(apiFetch('/auth/change-password', { method: 'POST', json }))

    expect(
      await change({ currentPassword: clienteAdmin.password, newPassword: 'corta' }),
    ).toMatchObject({ status: 400, code: 'validation_error' })
    expect(
      await change({ currentPassword: 'otra-cosa-123', newPassword: 'Nueva-clave-2026' }),
    ).toMatchObject({ status: 400, code: 'invalid_current_password' })
    expect(
      await change({ currentPassword: clienteAdmin.password, newPassword: clienteAdmin.password }),
    ).toMatchObject({ status: 400, code: 'validation_error' })

    await expect(
      apiFetch('/auth/change-password', {
        method: 'POST',
        json: { currentPassword: clienteAdmin.password, newPassword: 'Nueva-clave-2026' },
      }),
    ).resolves.toBeUndefined()
    const me = await apiFetch('/auth/me')
    expect(me.mustChangePassword).toBe(false)
  })

  it('logout cierra la sesión', async () => {
    await login(clienteUsuario)
    await apiFetch('/auth/logout', { method: 'POST' })
    expect(await fail(apiFetch('/auth/me'))).toMatchObject({ status: 401 })
  })
})

describe('mocks: usuarios', () => {
  it('un cliente recibe 403 forbidden en /staff/*', async () => {
    signInAs(clienteUsuario.email)
    expect(await fail(apiFetch('/staff/users'))).toMatchObject({ status: 403, code: 'forbidden' })
  })

  it('pagina con { items, page, pageSize, total } y filtra por empresa', async () => {
    signInAs(smarteam.email)
    const first = await apiFetch('/staff/users', { query: { page: 1, pageSize: 25 } })
    expect(first).toMatchObject({ page: 1, pageSize: 25, total: getDb().users.length })
    expect(first.items).toHaveLength(25)
    expect(first.items[0]).not.toHaveProperty('password')

    const second = await apiFetch('/staff/users', { query: { page: 2, pageSize: 25 } })
    expect(second.items).toHaveLength(getDb().users.length - 25)

    const acme = await apiFetch('/staff/users', { query: { tenantKey: 'ACME' } })
    expect(acme.items.every((user) => user.tenantKey === 'ACME')).toBe(true)
    expect(acme.total).toBeLessThan(first.total)
  })

  it('pageSize mayor a 100 da 400', async () => {
    signInAs(smarteam.email)
    expect(await fail(apiFetch('/staff/users', { query: { pageSize: 101 } }))).toMatchObject({
      status: 400,
    })
  })

  it('crear devuelve la temporal una vez; correo duplicado da 409', async () => {
    signInAs(smarteam.email)
    const json = {
      email: 'nuevo@acme.test',
      name: 'Nuevo',
      accountType: 'cliente',
      tenantKey: 'ACME',
      role: 'usuario',
    }
    const created = await apiFetch('/staff/users', { method: 'POST', json })
    expect(created.temporaryPassword).toMatch(/^.{4}-.{4}-.{4}$/)
    expect(created.user).toMatchObject({ email: 'nuevo@acme.test', mustChangePassword: true })
    expect(await fail(apiFetch('/staff/users', { method: 'POST', json }))).toMatchObject({
      status: 409,
      code: 'email_taken',
    })
  })

  it('desactivar corta la sesión abierta de ese usuario en el siguiente request', async () => {
    signInAs(clienteUsuario.email)
    expect(await apiFetch('/auth/me')).toMatchObject({ email: clienteUsuario.email })

    signInAs(smarteam.email)
    await apiFetch('/staff/users/u-acme-usuario', { method: 'PATCH', json: { active: false } })

    // La "cookie" anterior del usuario ya no sirve.
    const sessionId = Object.keys(getDb().sessions).find(
      (id) => getDb().sessions[id].userId === 'u-acme-usuario',
    )
    const user = getDb().users.find((candidate) => candidate.id === 'u-acme-usuario')
    expect(getDb().sessions[sessionId].tv).not.toBe(user.tokenVersion)
  })

  it('no se puede desactivar la propia cuenta', async () => {
    signInAs(smarteam.email)
    expect(
      await fail(apiFetch('/staff/users/u-staff-1', { method: 'PATCH', json: { active: false } })),
    ).toMatchObject({ status: 400 })
  })
})
