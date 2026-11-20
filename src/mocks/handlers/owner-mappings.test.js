import { beforeEach, describe, expect, it } from 'vitest'

import { apiFetch } from '@/lib/api/client'

import { getDb, signInAs } from '../db'
import { DEMO_ACCOUNTS } from '../seed'

const fail = (promise) =>
  promise.then(
    () => null,
    (error) => error,
  )
const admin = DEMO_ACCOUNTS.clienteAdmin.email // ACME, rol admin
const user = DEMO_ACCOUNTS.clienteUsuario.email // ACME, rol usuario
const staff = DEMO_ACCOUNTS.smarteam.email

const rows = (tenantKey = 'ACME') => getDb().ownerMappings.filter((o) => o.tenantKey === tenantKey)
const byName = (name) => rows().find((o) => o.crmOwnerName === name)
const patch = (row, body, base = '') =>
  apiFetch(`${base}/owner-mappings/${row.id}`, {
    method: 'PATCH',
    json: { expectedUpdatedAt: row.updatedAt, ...body },
  })

describe('mapeo de responsables: edición (O1 a O5)', () => {
  beforeEach(() => {
    getDb().users.find((u) => u.email === admin).mustChangePassword = false
    signInAs(admin)
  })

  it('el admin cambia vendedor y empleado; queda el historial con quién, cuándo, antes y después', async () => {
    const row = byName('Erick Figueroa Pavón')
    const before = row.updatedAt
    const item = await patch(row, { erpOwnerId: ' 113, 758 ', erpEmployeeId: 70 })
    expect(item).toMatchObject({ id: row.id, erpOwnerId: '113,758', erpEmployeeId: '70' })
    expect(item.tenantKey).toBeUndefined()
    expect(Date.parse(item.updatedAt)).toBeGreaterThan(Date.parse(before))

    const [entry] = getDb().ownerMappingHistory
    expect(entry).toMatchObject({
      mappingId: row.id,
      crmOwnerId: row.crmOwnerId,
      action: 'updated',
      changedBy: { email: admin, accountType: 'cliente' },
      changedAt: item.updatedAt,
      changes: [
        { field: 'erpOwnerId', from: 53, to: '113,758' },
        { field: 'erpEmployeeId', from: 67, to: '70' },
      ],
    })
  })

  it('vacío o null quita el código; sin cambios reales no escribe historial ni fecha', async () => {
    const row = byName('Erick Figueroa Pavón')
    const same = await patch(row, { erpOwnerId: '53', erpEmployeeId: 67 })
    expect(same.updatedAt).toBe(row.updatedAt)
    expect(getDb().ownerMappingHistory).toHaveLength(0)

    const cleared = await patch(row, { erpOwnerId: '', erpEmployeeId: null })
    expect(cleared).toMatchObject({ erpOwnerId: null, erpEmployeeId: null })
    expect(getDb().ownerMappingHistory).toHaveLength(1)
  })

  it('validaciones: formato, campos que no se editan y expectedUpdatedAt', async () => {
    const row = byName('Ana Mora')
    for (const body of [
      { erpOwnerId: 'abc' },
      { erpOwnerId: '5,' },
      { erpOwnerId: { a: 1 } },
      { erpEmployeeId: '67,68' },
      { erpEmployeeId: '6.7' },
      { erpOwnerId: '5', active: false },
      { erpOwnerId: '5', crmOwnerName: 'Otro' },
      {},
    ]) {
      const error = await fail(patch(row, body))
      expect(error, JSON.stringify(body)).toMatchObject({ status: 400, code: 'validation_error' })
    }
    const missing = await fail(
      apiFetch(`/owner-mappings/${row.id}`, { method: 'PATCH', json: { erpOwnerId: '5' } }),
    )
    expect(missing).toMatchObject({ status: 400 })
    expect(getDb().ownerMappingHistory).toHaveLength(0)
  })

  it('409 si otro lo cambió antes (stale_update) o si el vendedor ya es de otro responsable', async () => {
    const row = byName('Ana Mora')
    const stale = await fail(
      apiFetch(`/owner-mappings/${row.id}`, {
        method: 'PATCH',
        json: { erpOwnerId: '99', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' },
      }),
    )
    expect(stale).toMatchObject({ status: 409, code: 'stale_update' })
    expect(await fail(patch(row, { erpOwnerId: '53' }))).toMatchObject({
      status: 409,
      code: 'erp_owner_taken',
    })
    expect(row.erpOwnerId).toBe(12)
  })

  it('permisos: el usuario del cliente no edita ni sincroniza; otra empresa da 404', async () => {
    const row = byName('Ana Mora')
    signInAs(user)
    expect(await fail(patch(row, { erpOwnerId: '99' }))).toMatchObject({ status: 403 })
    expect(await fail(apiFetch('/owner-mappings/sync', { method: 'POST' }))).toMatchObject({
      status: 403,
    })
    signInAs(admin)
    const [globex] = rows('GLOBEX')
    expect(await fail(patch(globex, { erpOwnerId: '99' }))).toMatchObject({ status: 404 })
    signInAs(staff)
    const item = await patch(globex, { erpEmployeeId: '15' }, '/staff/tenants/GLOBEX')
    expect(item.erpEmployeeId).toBe('15')
    expect(getDb().ownerMappingHistory.at(-1).changedBy.accountType).toBe('smarteam')
  })

  it('sincronizar: agrega los que faltan, refresca nombre y correo y no toca los códigos', async () => {
    const before = rows().length
    const erick = { ...byName('Erick Figueroa Pavón') }
    const first = await apiFetch('/owner-mappings/sync', { method: 'POST' })
    expect(first).toEqual({ added: 2, updated: 1, total: before + 2 })
    expect(byName('Nuria Campos')).toMatchObject({
      erpOwnerId: null,
      erpEmployeeId: null,
      active: true,
      source: 'crm_seed',
    })
    expect(byName('Soporte Acme')).toMatchObject({ erpOwnerId: 7, source: 'manual' })
    expect(byName('Erick Figueroa Pavón')).toEqual(erick)
    expect(getDb().ownerMappingHistory.map((entry) => entry.action)).toEqual([
      'synced_created',
      'synced_created',
    ])

    // Repetirlo no duplica.
    expect(await apiFetch('/owner-mappings/sync', { method: 'POST' })).toEqual({
      added: 0,
      updated: 0,
      total: before + 2,
    })
  })
})
