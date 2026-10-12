import { delay, HttpResponse } from 'msw'

import { getSessionUser } from '../db'
import { permissionsFor } from '../permissions'

let responseDelay = 0

/** Demora de las respuestas simuladas (solo en el navegador, para ver los estados de carga). */
export function setMockDelay(ms) {
  responseDelay = ms
}

export async function maybeDelay() {
  if (responseDelay > 0) await delay(responseDelay)
}

export function errorResponse(status, error, message) {
  return HttpResponse.json(message ? { error, message } : { error }, { status })
}

/** Las mutaciones deben traer X-Panel-Request: 1 (defensa CSRF del spec). */
export function checkPanelHeader(request) {
  if (request.headers.get('X-Panel-Request') !== '1') {
    return errorResponse(403, 'missing_panel_header')
  }
  return null
}

/**
 * Simula el hook de sesión y el guard por permiso del backend.
 * Devuelve `{ user }` o `{ response }` con el error que daría la API.
 */
export function authorize({ permission, allowPasswordChange = false } = {}) {
  const user = getSessionUser()
  if (!user) return { response: errorResponse(401, 'unauthorized') }
  if (user.mustChangePassword && !allowPasswordChange) {
    return { response: errorResponse(403, 'password_change_required') }
  }
  if (permission && !permissionsFor(user).includes(permission)) {
    return { response: errorResponse(403, 'forbidden') }
  }
  return { user }
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
