import { http, HttpResponse } from 'msw'

import { getDb, save } from '../db'
import { SEED_CRM_OWNERS } from '../seed-owner-mappings'
import { resolveScope } from './scope'
import { checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

// Mapeo de responsables: lectura (contrato N1 a N3) y edición por el administrador
// (contrato O1 a O5): solo el vendedor y el empleado del ERP, sincronizar con el CRM e historial.

const PATH = '/owner-mappings'
const EDITABLE = ['erpOwnerId', 'erpEmployeeId']
const ALLOWED_KEYS = new Set([...EDITABLE, 'expectedUpdatedAt'])
const SELLER = /^\d+(,\d+)*$/
const EMPLOYEE = /^\d{1,18}$/

// eslint-disable-next-line no-unused-vars
const toItem = ({ tenantKey, ...item }) => item
const rowsOf = (tenantKey) => getDb().ownerMappings.filter((item) => item.tenantKey === tenantKey)
const sameCode = (a, b) => (a === null ? null : String(a)) === (b === null ? null : String(b))

/** Registra el mismo handler en la ruta de cliente y en la de Smarteam por empresa. */
const scoped = (method, suffix, resolver) => [
  http[method](`/api${PATH}${suffix}`, resolver),
  http[method](`/api/staff/tenants/:tenantKey${PATH}${suffix}`, resolver),
]

/** `null`, número o texto → texto normalizado, `null`, o `undefined` si no es válido. */
function normalizeCode(value, pattern) {
  if (value === null) return null
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).replace(/\s+/g, '')
  if (text === '') return null
  return pattern.test(text) && text.length <= 100 ? text : undefined
}

const actorOf = (user) => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  accountType: user.accountType,
})

/** Fecha de cambio siempre posterior a la anterior (dos cambios en el mismo ms no se confunden). */
function nextTimestamp(previous) {
  const now = Date.now()
  const last = Date.parse(previous ?? '') || 0
  return new Date(Math.max(now, last + 1)).toISOString()
}

function addHistory(entry) {
  const history = getDb().ownerMappingHistory
  history.push({ id: `omh-${String(history.length + 1).padStart(4, '0')}`, ...entry })
}

export const ownerMappingHandlers = [
  ...scoped('get', '', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'mappings.read', params })
    if (scope.response) return scope.response
    return HttpResponse.json({ items: rowsOf(scope.tenantKey).map(toItem) })
  }),

  // O3. Antes que `/:id` para que "sync" no se tome como un id.
  ...scoped('post', '/sync', async ({ request, params }) => {
    await maybeDelay()
    const header = checkPanelHeader(request)
    if (header) return header
    const scope = resolveScope({ permission: 'owners.write', params })
    if (scope.response) return scope.response

    const at = new Date().toISOString()
    let added = 0
    let updated = 0
    for (const owner of SEED_CRM_OWNERS.filter((o) => o.tenantKey === scope.tenantKey)) {
      const row = rowsOf(scope.tenantKey).find((item) => item.crmOwnerId === owner.crmOwnerId)
      if (!row) {
        const created = {
          id: `own-${scope.tenantKey.toLowerCase()}-${owner.crmOwnerId}`,
          ...owner,
          erpOwnerId: null,
          erpOwnerName: null,
          erpEmployeeId: null,
          active: true,
          source: 'crm_seed',
          createdAt: at,
          updatedAt: at,
        }
        getDb().ownerMappings.push(created)
        addHistory({
          mappingId: created.id,
          crmOwnerId: created.crmOwnerId,
          action: 'synced_created',
          changedBy: actorOf(scope.user),
          changedAt: at,
          changes: [],
        })
        added += 1
      } else if (
        row.crmOwnerName !== owner.crmOwnerName ||
        row.crmOwnerEmail !== owner.crmOwnerEmail
      ) {
        // Solo nombre y correo: los códigos del ERP nunca se tocan al sincronizar.
        row.crmOwnerName = owner.crmOwnerName
        row.crmOwnerEmail = owner.crmOwnerEmail
        row.updatedAt = nextTimestamp(row.updatedAt)
        updated += 1
      }
    }
    save()
    return HttpResponse.json({ added, updated, total: rowsOf(scope.tenantKey).length })
  }),

  // O2. Solo `erpOwnerId` y `erpEmployeeId`.
  ...scoped('patch', '/:id', async ({ request, params }) => {
    await maybeDelay()
    const header = checkPanelHeader(request)
    if (header) return header
    const scope = resolveScope({ permission: 'owners.write', params })
    if (scope.response) return scope.response
    const row = rowsOf(scope.tenantKey).find((item) => item.id === params.id)
    if (!row) return errorResponse(404, 'not_found')

    const body = await readJson(request)
    const invalid = (message) => errorResponse(400, 'validation_error', message)
    const extra = Object.keys(body).find((key) => !ALLOWED_KEYS.has(key))
    if (extra) return invalid(`El campo ${extra} no se puede editar.`)
    if (!EDITABLE.some((key) => Object.hasOwn(body, key))) {
      return invalid('Envía erpOwnerId o erpEmployeeId.')
    }
    if (typeof body.expectedUpdatedAt !== 'string') {
      return invalid('Falta expectedUpdatedAt.')
    }

    const next = {}
    if (Object.hasOwn(body, 'erpOwnerId')) {
      next.erpOwnerId = normalizeCode(body.erpOwnerId, SELLER)
      if (next.erpOwnerId === undefined) {
        return invalid('El vendedor (erpOwnerId) debe ser un número o varios separados por coma.')
      }
    }
    if (Object.hasOwn(body, 'erpEmployeeId')) {
      next.erpEmployeeId = normalizeCode(body.erpEmployeeId, EMPLOYEE)
      if (next.erpEmployeeId === undefined) {
        return invalid('El empleado (erpEmployeeId) debe ser un solo número.')
      }
    }

    if (body.expectedUpdatedAt !== row.updatedAt) return errorResponse(409, 'stale_update')
    if (
      next.erpOwnerId &&
      rowsOf(scope.tenantKey).some(
        (other) => other.id !== row.id && sameCode(other.erpOwnerId, next.erpOwnerId),
      )
    ) {
      return errorResponse(409, 'erp_owner_taken')
    }

    const changes = Object.entries(next)
      .filter(([field, to]) => !sameCode(row[field] ?? null, to))
      .map(([field, to]) => ({ field, from: row[field] ?? null, to }))
    // Sin cambios reales no se escribe nada (ni historial ni fecha).
    if (changes.length > 0) {
      const at = nextTimestamp(row.updatedAt)
      for (const { field, to } of changes) row[field] = to
      row.updatedAt = at
      addHistory({
        mappingId: row.id,
        crmOwnerId: row.crmOwnerId,
        action: 'updated',
        changedBy: actorOf(scope.user),
        changedAt: at,
        changes,
      })
      save()
    }
    return HttpResponse.json(toItem(row))
  }),
]
