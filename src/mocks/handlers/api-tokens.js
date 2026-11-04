import { http, HttpResponse } from 'msw'

import {
  buildToken,
  generateTokenValue,
  hashToken,
  isTokenActive,
  MAX_ACTIVE_TOKENS,
  TOKEN_PATTERN,
  toTokenItem,
} from '../api-tokens'
import { getDb, save } from '../db'
import { permissionsFor } from '../permissions'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

const NAME_MAX = 60
const PERMISSION = 'staff.tickets'

/** Tokens vigentes (ni revocados ni vencidos) de una cuenta, del más nuevo al más viejo. */
function listActiveTokens(userId) {
  return getDb()
    .apiTokens.filter((token) => token.userId === userId && isTokenActive(token))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * Revoca todos los tokens de una cuenta (al desactivarla o al restablecerle la contraseña).
 * Reactivar la cuenta no los revive. Quien llama guarda.
 */
export function revokeAllTokensOf(userId) {
  const now = new Date().toISOString()
  for (const token of getDb().apiTokens) {
    if (token.userId === userId && !token.revokedAt) token.revokedAt = now
  }
}

/** 401 de un token que no sirve, con el header de RFC 6750. */
const invalidToken = () =>
  HttpResponse.json(
    { error: 'invalid_token', message: 'El token no es válido.' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } },
  )

/** ¿Tiene caracteres de control (C0, DEL o C1)? */
const hasControlChars = (text) =>
  Array.from(text).some((char) => {
    const code = char.codePointAt(0)
    return code < 0x20 || (code >= 0x7f && code <= 0x9f)
  })

/**
 * Cuenta de un header `Authorization: Bearer spn_…` (plan 4z). Devuelve `{ user, scope }` si el
 * token está vigente, o `{ response }` con el error. Sin header devuelve `{ none: true }`.
 * - Formato distinto de `spn_` + 43 base64url → 401 sin buscarlo.
 * - Token inexistente, revocado o vencido; cuenta inexistente, inactiva o sin `staff.tickets`
 *   → 401 invalid_token con `WWW-Authenticate`.
 * - Cuenta con cambio de contraseña pendiente → 403 password_change_required.
 * Marca el último uso.
 */
export function authorizeBearer(request) {
  const header = request.headers.get('Authorization')
  if (header === null) return { none: true }
  // El esquema "Bearer" no distingue mayúsculas.
  const value = /^bearer +(\S+)$/i.exec(header.trim())?.[1] ?? ''
  if (!TOKEN_PATTERN.test(value)) return { response: invalidToken() }

  const hash = hashToken(value)
  const token = getDb().apiTokens.find((candidate) => candidate.hash === hash)
  if (!token || !isTokenActive(token)) return { response: invalidToken() }
  const user = getDb().users.find((candidate) => candidate.id === token.userId)
  if (!user || !user.active || !permissionsFor(user).includes(PERMISSION)) {
    return { response: invalidToken() }
  }
  if (user.mustChangePassword) return { response: errorResponse(403, 'password_change_required') }

  token.lastUsedAt = new Date().toISOString()
  save()
  return { user, scope: `token:${token.id}` }
}

export const apiTokenHandlers = [
  http.get('/api/account/api-tokens', async () => {
    await maybeDelay()
    const { user, response } = authorize({ permission: PERMISSION })
    if (response) return response
    // Solo los vigentes: los vencidos y los revocados no se listan.
    return HttpResponse.json({ items: listActiveTokens(user.id).map(toTokenItem) })
  }),

  http.post('/api/account/api-tokens', async ({ request }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ permission: PERMISSION })
    if (response) return response

    const body = await readJson(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return errorResponse(400, 'validation_error', 'Escribe un nombre para el token.')
    if (name.length > NAME_MAX) {
      return errorResponse(
        400,
        'validation_error',
        `El nombre admite hasta ${NAME_MAX} caracteres.`,
      )
    }
    if (hasControlChars(name)) {
      return errorResponse(400, 'validation_error', 'El nombre tiene caracteres no permitidos.')
    }
    // Crear un token pide la contraseña actual (mismo error que en el cambio de contraseña).
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    if (!currentPassword) {
      return errorResponse(400, 'validation_error', 'Escribe tu contraseña actual.')
    }
    if (currentPassword !== user.password) return errorResponse(400, 'invalid_current_password')

    if (listActiveTokens(user.id).length >= MAX_ACTIVE_TOKENS) {
      return errorResponse(
        409,
        'token_limit',
        `Ya tienes ${MAX_ACTIVE_TOKENS} tokens activos. Revoca uno para crear otro.`,
      )
    }

    const value = generateTokenValue()
    const token = buildToken({ userId: user.id, name, value, createdAt: new Date().toISOString() })
    getDb().apiTokens.push(token)
    save()
    // El valor completo sale una sola vez: aquí. Solo se guarda su hash.
    return HttpResponse.json({ token: value, item: toTokenItem(token) }, { status: 201 })
  }),

  http.delete('/api/account/api-tokens/:id', async ({ request, params }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ permission: PERMISSION })
    if (response) return response

    const token = getDb().apiTokens.find(
      (candidate) =>
        candidate.id === params.id && candidate.userId === user.id && !candidate.revokedAt,
    )
    // Ajeno o inexistente: 404, sin decir cuál de los dos.
    if (!token) return errorResponse(404, 'not_found')
    token.revokedAt = new Date().toISOString()
    save()
    return new HttpResponse(null, { status: 204 })
  }),
]
