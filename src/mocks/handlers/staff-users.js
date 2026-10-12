import { http, HttpResponse } from 'msw'

import { getDb, save } from '../db'
import { authorize, checkPanelHeader, errorResponse, maybeDelay, readJson } from './utils'

const MAX_PAGE_SIZE = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function temporaryPassword() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`
}

/** Forma pública de un usuario (supuesto C6): nunca incluye la contraseña. */
export function toPublicUser(user) {
  const tenant = getDb().tenants.find((candidate) => candidate.tenantKey === user.tenantKey)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    tenantKey: user.tenantKey,
    companyName: tenant?.companyName ?? null,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

function parsePositiveInt(value, fallback) {
  if (value === null) return fallback
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 ? number : NaN
}

export const staffUsersHandlers = [
  http.get('/api/staff/users', async ({ request }) => {
    await maybeDelay()
    const { response } = authorize({ permission: 'staff.users' })
    if (response) return response

    const params = new URL(request.url).searchParams
    const page = parsePositiveInt(params.get('page'), 1)
    const pageSize = parsePositiveInt(params.get('pageSize'), 25)
    if (Number.isNaN(page) || Number.isNaN(pageSize) || pageSize > MAX_PAGE_SIZE) {
      return errorResponse(400, 'validation_error', 'Paginación inválida.')
    }

    const tenantKey = params.get('tenantKey')
    const filtered = getDb()
      .users.filter((user) => !tenantKey || user.tenantKey === tenantKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const start = (page - 1) * pageSize
    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize).map(toPublicUser),
      page,
      pageSize,
      total: filtered.length,
    })
  }),

  http.post('/api/staff/users', async ({ request }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user: staff, response } = authorize({ permission: 'staff.users' })
    if (response) return response

    const body = await readJson(request)
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const name = String(body.name ?? '').trim()
    const accountType = body.accountType
    if (!EMAIL_PATTERN.test(email) || !name || !['smarteam', 'cliente'].includes(accountType)) {
      return errorResponse(
        400,
        'validation_error',
        'Revisa el correo, el nombre y el tipo de cuenta.',
      )
    }

    let tenantKey = null
    let role = null
    if (accountType === 'cliente') {
      tenantKey = body.tenantKey
      role = body.role
      if (!getDb().tenants.some((tenant) => tenant.tenantKey === tenantKey)) {
        return errorResponse(400, 'validation_error', 'La empresa no existe.')
      }
      if (!['admin', 'usuario'].includes(role)) {
        return errorResponse(400, 'validation_error', 'El rol no es válido.')
      }
    }

    if (getDb().users.some((user) => user.email === email)) {
      return errorResponse(409, 'email_taken')
    }

    const password = temporaryPassword()
    const now = new Date().toISOString()
    const user = {
      id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      email,
      name,
      accountType,
      tenantKey,
      role,
      password,
      mustChangePassword: true,
      active: true,
      tokenVersion: 0,
      lastLoginAt: null,
      createdAt: now,
      createdBy: staff.id,
    }
    getDb().users.push(user)
    save()
    return HttpResponse.json(
      { user: toPublicUser(user), temporaryPassword: password },
      { status: 201 },
    )
  }),

  http.post('/api/staff/users/:id/reset-password', async ({ request, params }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { response } = authorize({ permission: 'staff.users' })
    if (response) return response

    const user = getDb().users.find((candidate) => candidate.id === params.id)
    if (!user) return errorResponse(404, 'not_found')

    const password = temporaryPassword()
    user.password = password
    user.mustChangePassword = true
    user.tokenVersion += 1 // invalida sus sesiones abiertas
    save()
    return HttpResponse.json({ temporaryPassword: password })
  }),

  http.patch('/api/staff/users/:id', async ({ request, params }) => {
    await maybeDelay()
    const headerError = checkPanelHeader(request)
    if (headerError) return headerError
    const { user: staff, response } = authorize({ permission: 'staff.users' })
    if (response) return response

    const user = getDb().users.find((candidate) => candidate.id === params.id)
    if (!user) return errorResponse(404, 'not_found')

    const body = await readJson(request)
    if ('tenantKey' in body || 'accountType' in body) {
      return errorResponse(
        400,
        'validation_error',
        'No se puede cambiar la empresa ni el tipo de cuenta.',
      )
    }
    if (body.role !== undefined) {
      if (user.accountType !== 'cliente' || !['admin', 'usuario'].includes(body.role)) {
        return errorResponse(400, 'validation_error', 'El rol no es válido para este usuario.')
      }
      user.role = body.role
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) return errorResponse(400, 'validation_error', 'El nombre no puede quedar vacío.')
      user.name = name
    }
    if (body.active !== undefined) {
      // Supuesto C9: nadie se desactiva a sí mismo.
      if (user.id === staff.id && body.active === false) {
        return errorResponse(400, 'validation_error', 'No puedes desactivar tu propia cuenta.')
      }
      if (user.active && body.active === false) user.tokenVersion += 1
      user.active = Boolean(body.active)
    }
    save()
    return HttpResponse.json({ user: toPublicUser(user) })
  }),
]
