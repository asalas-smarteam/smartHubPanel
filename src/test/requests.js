import { server } from '@/mocks/server'

/**
 * Registra las requests que recibe el mock para un path (sin alterar las respuestas).
 * @param {string} pathname p. ej. '/api/staff/users'
 * @param {string} [method]
 */
export function recordRequests(pathname, method) {
  const requests = []
  const listener = ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === pathname && (!method || request.method === method)) {
      requests.push({ url, method: request.method, headers: request.headers })
    }
  }
  server.events.on('request:start', listener)
  return requests
}
