import { describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { hashToken, SEED_API_TOKEN } from '../api-tokens'
import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const DAY_MS = 24 * 3_600_000

const list = () => apiFetch('/account/api-tokens')
const create = (name, currentPassword = DEMO_ACCOUNTS.smarteam.password) =>
  apiFetch('/account/api-tokens', { method: 'POST', json: { name, currentPassword } })
const revoke = (id) => apiFetch(`/account/api-tokens/${id}`, { method: 'DELETE' })

describe('mocks: tokens personales de la API (plan 4z)', () => {
  it('la cuenta Smarteam del seed trae un token de ejemplo, sin el valor ni el hash', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const { items } = await list()
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      id: expect.any(String),
      name: 'Claude (portátil)',
      prefix: SEED_API_TOKEN.slice(0, 8),
      createdAt: expect.any(String),
      lastUsedAt: expect.any(String),
      expiresAt: expect.any(String),
    })
    // Se guarda el hash, nunca el valor en claro.
    expect(JSON.stringify(getDb().apiTokens)).not.toContain(SEED_API_TOKEN)
    expect(getDb().apiTokens[0].hash).toBe(hashToken(SEED_API_TOKEN))
  })

  it('crear devuelve el token una sola vez; la lista no lo trae y queda primero', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const before = Date.now()
    const created = await create('  Claude en la oficina  ')
    // `spn_` + 32 bytes en base64url sin relleno (43 caracteres).
    expect(created.token).toMatch(/^spn_[A-Za-z0-9_-]{43}$/)
    expect(created.item).toMatchObject({ name: 'Claude en la oficina', lastUsedAt: null })
    expect(created.item.prefix).toBe(created.token.slice(0, 8))

    // Vence a los 90 días.
    const ttl = Date.parse(created.item.expiresAt) - Date.parse(created.item.createdAt)
    expect(ttl).toBe(90 * DAY_MS)
    expect(Date.parse(created.item.createdAt)).toBeGreaterThanOrEqual(before - 1000)

    const { items } = await list()
    expect(items.map((item) => item.id)[0]).toBe(created.item.id)
    expect(JSON.stringify(items)).not.toContain(created.token)
    expect(JSON.stringify(getDb().apiTokens)).not.toContain(created.token)
  })

  it('pide la contraseña actual: incorrecta → 400 invalid_current_password; vacía → 400', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    expect(await fail(create('Sin clave', 'otra-clave-123'))).toMatchObject({
      status: 400,
      code: 'invalid_current_password',
    })
    expect(await fail(create('Sin clave', ''))).toMatchObject({
      status: 400,
      code: 'validation_error',
    })
    expect((await list()).items).toHaveLength(1)
  })

  it('rechaza caracteres de control en el nombre (400)', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    for (const name of ['Claude\u0000', 'Claude\nportátil', 'A\u001bB', 'A\u007fB', 'A\u0085B']) {
      expect(await fail(create(name))).toMatchObject({ status: 400, code: 'validation_error' })
    }
    expect((await create('Claude — portátil ñ')).item.name).toBe('Claude — portátil ñ')
  })

  it('valida el nombre: vacío o de más de 60 caracteres → 400', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    expect(await fail(create('   '))).toMatchObject({ status: 400, code: 'validation_error' })
    expect(await fail(create('x'.repeat(61)))).toMatchObject({
      status: 400,
      code: 'validation_error',
    })
    expect((await create('x'.repeat(60))).item.name).toHaveLength(60)
  })

  it('máximo 5 activos: el sexto da 409 token_limit; revocando uno se puede crear otro', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    for (let i = 0; i < 4; i += 1) await create(`Equipo ${i + 1}`)
    expect(await fail(create('Uno más'))).toMatchObject({ status: 409, code: 'token_limit' })

    const { items } = await list()
    await expect(revoke(items[0].id)).resolves.toBeUndefined()
    expect((await list()).items).toHaveLength(4)
    expect((await create('Ahora sí')).item.name).toBe('Ahora sí')
  })

  it('los vencidos no se listan ni cuentan para el límite', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    for (let i = 0; i < 4; i += 1) await create(`Equipo ${i + 1}`)
    getDb().apiTokens[0].expiresAt = new Date(Date.now() - DAY_MS).toISOString()
    const { items } = await list()
    expect(items).toHaveLength(4)
    expect(items.map((item) => item.name)).not.toContain('Claude (portátil)')
    expect((await create('Reemplazo')).item.name).toBe('Reemplazo')
  })

  it('desactivar o restablecer la contraseña de un usuario revoca sus tokens; reactivar no los revive', async () => {
    const owner = getDb().users.find((user) => user.id === 'u-staff-1')
    const other = getDb().users.find(
      (user) => user.accountType === 'smarteam' && user.active && user.id !== owner.id,
    )
    const activeOf = (userId) =>
      getDb().apiTokens.filter((token) => token.userId === userId && !token.revokedAt)

    // Restablecer la contraseña (admin).
    signInAs(other.email)
    await apiFetch(`/staff/users/${owner.id}/reset-password`, { method: 'POST' })
    expect(activeOf(owner.id)).toHaveLength(0)

    // Desactivar y reactivar.
    signInAs(owner.email)
    owner.mustChangePassword = false
    await create('Nuevo', owner.password)
    expect(activeOf(owner.id)).toHaveLength(1)
    signInAs(other.email)
    await apiFetch(`/staff/users/${owner.id}`, { method: 'PATCH', json: { active: false } })
    expect(activeOf(owner.id)).toHaveLength(0)
    await apiFetch(`/staff/users/${owner.id}`, { method: 'PATCH', json: { active: true } })
    expect(activeOf(owner.id)).toHaveLength(0)
  })

  it('revocar: 204 el propio; 404 si es ajeno, inexistente o ya revocado', async () => {
    signInAs(DEMO_ACCOUNTS.smarteam.email)
    const { item } = await create('Para revocar')
    const other = getDb().users.find(
      (user) => user.accountType === 'smarteam' && user.active && user.id !== 'u-staff-1',
    )
    signInAs(other.email)
    expect(await fail(revoke(item.id))).toMatchObject({ status: 404, code: 'not_found' })
    expect(await fail(revoke('tok-no-existe'))).toMatchObject({ status: 404 })
    expect((await list()).items).toEqual([])

    signInAs(DEMO_ACCOUNTS.smarteam.email)
    await expect(revoke(item.id)).resolves.toBeUndefined()
    expect(await fail(revoke(item.id))).toMatchObject({ status: 404 })
    expect((await list()).items.map((one) => one.id)).not.toContain(item.id)
  })

  it('sin sesión 401; un cliente no tiene acceso (403)', async () => {
    expect(await fail(list())).toMatchObject({ status: 401 })
    signInAs(DEMO_ACCOUNTS.clienteUsuario.email)
    expect(await fail(list())).toMatchObject({ status: 403, code: 'forbidden' })
    expect(await fail(create('Mío'))).toMatchObject({ status: 403 })
  })
})
