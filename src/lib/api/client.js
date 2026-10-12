import { ApiError, ERROR_CODES } from './errors'

const SAFE_METHODS = new Set(['GET', 'HEAD'])

/**
 * Llama a la API del panel (`/api/*`, mismo origen; la cookie de sesión la manda el navegador).
 *
 * - Las mutaciones llevan `X-Panel-Request: 1` (defensa CSRF que exige la API).
 * - Si se pasa `schema` (Zod), la respuesta se valida; si no coincide, lanza `invalid_response`.
 * - Cualquier respuesta no 2xx lanza `ApiError`.
 *
 * @template T
 * @param {string} path Ruta relativa a /api, p. ej. `/auth/me`.
 * @param {{
 *   method?: string,
 *   json?: unknown,
 *   formData?: FormData,
 *   query?: Record<string, string | number | boolean | null | undefined>,
 *   signal?: AbortSignal,
 *   schema?: { safeParse: (data: unknown) => { success: boolean, data?: T, error?: unknown } },
 * }} [options]
 * @returns {Promise<T>}
 */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', json, formData, query, signal, schema } = options
  const upperMethod = method.toUpperCase()

  const url = new URL(`/api${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const headers = { Accept: 'application/json' }
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (formData) {
    body = formData
  }
  if (!SAFE_METHODS.has(upperMethod)) {
    headers['X-Panel-Request'] = '1'
  }

  let response
  try {
    response = await fetch(url, {
      method: upperMethod,
      headers,
      body,
      signal,
      credentials: 'same-origin',
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new ApiError({ status: 0, code: ERROR_CODES.NETWORK_ERROR, details: error })
  }

  const data = await readBody(response)

  if (!response.ok) {
    throw toApiError(response.status, data)
  }

  if (schema && data !== undefined) {
    const result = schema.safeParse(data)
    if (!result.success) {
      if (import.meta.env.DEV) {
        console.error(`[api] Respuesta inesperada de ${upperMethod} ${path}`, result.error)
      }
      throw new ApiError({
        status: response.status,
        code: ERROR_CODES.INVALID_RESPONSE,
        details: result.error,
      })
    }
    return result.data
  }

  return data
}

async function readBody(response) {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return undefined
    }
  }
  return text
}

/**
 * Normaliza los tres formatos de error que puede devolver el backend:
 * `{ error: 'codigo', message }` (contrato del panel), `{ ok: false, message }` (rutas actuales)
 * y `{ statusCode, error: 'Bad Request', message }` (por defecto de Fastify).
 */
function toApiError(status, data) {
  if (!data || typeof data !== 'object') {
    return new ApiError({ status })
  }
  const rawCode = typeof data.code === 'string' ? data.code : data.error
  // En el formato de Fastify, `error` es el nombre del status ("Bad Request"), no un código.
  const isFastifyDefault = typeof data.statusCode === 'number'
  const code =
    typeof rawCode === 'string' && !isFastifyDefault && /^[a-z0-9_]+$/.test(rawCode)
      ? rawCode
      : null
  const message = typeof data.message === 'string' ? data.message : null
  return new ApiError({ status, code, message, details: data })
}
