import { getDb } from '../db'
import { authorize, errorResponse } from './utils'

/**
 * Empresa de una ruta de Eventos/Syncs (plan 4c §2), como lo hará el backend:
 * - ruta de cliente: siempre el tenant de la sesión (una cuenta sin tenant recibe 403);
 * - ruta `/staff/tenants/:tenantKey`: solo cuentas Smarteam; empresa inexistente → 404 (E10),
 *   las suspendidas se pueden consultar.
 * Devuelve `{ user, tenantKey }` o `{ response }`.
 */
export function resolveScope({ permission, params }) {
  const { user, response } = authorize({ permission })
  if (response) return { response }
  if (params.tenantKey === undefined) {
    if (!user.tenantKey) return { response: errorResponse(403, 'forbidden') }
    return { user, tenantKey: user.tenantKey }
  }
  if (user.tenantKey) return { response: errorResponse(403, 'forbidden') }
  const exists = getDb().tenants.some((tenant) => tenant.tenantKey === params.tenantKey)
  if (!exists) return { response: errorResponse(404, 'not_found') }
  return { user, tenantKey: params.tenantKey }
}

/** `from`/`to` ISO (E3). Devuelve `{ from, to }` en ms, o null si alguna fecha es inválida. */
export function readDateRange(searchParams) {
  const parse = (name) => {
    const value = searchParams.get(name)
    if (!value) return { ok: true, ms: null }
    const ms = Date.parse(value)
    return { ok: !Number.isNaN(ms), ms }
  }
  const from = parse('from')
  const to = parse('to')
  if (!from.ok || !to.ok) return null
  return { from: from.ms, to: to.ms }
}

/** `from` inclusivo, `to` exclusivo. */
export function inRange(iso, { from, to }) {
  const ms = Date.parse(iso)
  return (from === null || ms >= from) && (to === null || ms < to)
}

/** Registra un handler GET en la ruta de cliente y en la de Smarteam por empresa. */
export function bothScopes(http, path, resolver) {
  return [
    http.get(`/api${path}`, resolver),
    http.get(`/api/staff/tenants/:tenantKey${path}`, resolver),
  ]
}
