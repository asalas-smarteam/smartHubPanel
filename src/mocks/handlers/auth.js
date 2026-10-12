import { http, HttpResponse } from 'msw'

import { createSession, destroyCurrentSession, getDb, refreshCurrentSession, save } from '../db'
import { permissionsFor } from '../permissions'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

const MAX_FAILED_LOGINS = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000
const MIN_PASSWORD_LENGTH = 10

/** Cuerpo de GET /auth/me (contrato del spec). */
export function toMe(user) {
  const tenant = getDb().tenants.find((candidate) => candidate.tenantKey === user.tenantKey)
  return {
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    role: user.role,
    tenantKey: user.tenantKey,
    companyName: tenant?.companyName ?? null,
    permissions: permissionsFor(user),
    mustChangePassword: user.mustChangePassword,
  }
}

function isLocked(email) {
  const entry = getDb().failedLogins[email]
  if (!entry) return false
  if (Date.now() - entry.firstAt > LOCK_WINDOW_MS) {
    delete getDb().failedLogins[email]
    return false
  }
  return entry.count >= MAX_FAILED_LOGINS
}

function registerFailure(email) {
  const failures = getDb().failedLogins
  const entry = failures[email]
  if (!entry || Date.now() - entry.firstAt > LOCK_WINDOW_MS) {
    failures[email] = { count: 1, firstAt: Date.now() }
  } else {
    entry.count += 1
  }
  save()
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError

    const body = await readJson(request)
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(body.password ?? '')
    if (!email || !password) return errorResponse(400, 'validation_error', 'Faltan datos.')

    if (isLocked(email)) return errorResponse(429, 'too_many_attempts')

    const user = getDb().users.find((candidate) => candidate.email === email)
    // Mismo error para "no existe", "inactivo" y "contraseña incorrecta".
    if (!user || !user.active || user.password !== password) {
      registerFailure(email)
      return errorResponse(401, 'invalid_credentials')
    }

    delete getDb().failedLogins[email]
    user.lastLoginAt = new Date().toISOString()
    createSession(user)
    return HttpResponse.json(toMe(user))
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    destroyCurrentSession()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/auth/me', async () => {
    await maybeDelay()
    // Supuesto C1: con cambio pendiente, /me responde 200 con mustChangePassword: true.
    const { user, response } = authorize({ allowPasswordChange: true })
    if (response) return response
    return HttpResponse.json(toMe(user))
  }),

  http.post('/api/auth/change-password', async ({ request }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user, response } = authorize({ allowPasswordChange: true })
    if (response) return response

    const body = await readJson(request)
    const currentPassword = String(body.currentPassword ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return errorResponse(
        400,
        'validation_error',
        `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
    }
    // Supuesto C2: actual incorrecta → 400 (no 401, para no confundirlo con sesión vencida).
    if (currentPassword !== user.password) return errorResponse(400, 'invalid_current_password')
    if (newPassword === currentPassword) {
      return errorResponse(
        400,
        'validation_error',
        'La contraseña nueva debe ser distinta de la actual.',
      )
    }

    user.password = newPassword
    user.mustChangePassword = false
    user.tokenVersion += 1
    // Supuesto C3: la respuesta emite una sesión nueva con el tokenVersion actualizado.
    refreshCurrentSession(user)
    save()
    return new HttpResponse(null, { status: 204 })
  }),
]
