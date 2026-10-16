import { server } from '@/mocks/server'

/**
 * Registra las requests que recibe el mock para un path (sin alterar las respuestas).
 * @param {string} pathname p. ej. '/api/staff/users'
 * @param {string} [method]
 * @param {{ ignore?: (url: URL) => boolean }} [options] Requests que no se registran.
 */
export function recordRequests(pathname, method, { ignore } = {}) {
  const requests = []
  const listener = ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === pathname && (!method || request.method === method) && !ignore?.(url)) {
      requests.push({ url, method: request.method, headers: request.headers })
    }
  }
  server.events.on('request:start', listener)
  return requests
}

/**
 * Páginas de 100 que se piden en bloque para calcular en el front (duraciones, corregidos):
 * no son la página que muestra la tabla.
 * @param {URL} url
 */
export const isBulkPage = (url) => url.searchParams.get('pageSize') === '100'
