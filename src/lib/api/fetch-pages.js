import { apiFetch } from './client'

/** Tamaño de página más grande que acepta la API del panel. */
export const MAX_PAGE_SIZE = 100
const CONCURRENCY = 4

/**
 * Corre `task` sobre `items` con a lo sumo `limit` pedidos a la vez, conservando el orden.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} task
 * @returns {Promise<R[]>}
 */
export async function mapLimited(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await task(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Las primeras páginas de una lista paginada de la API, hasta `limit` registros.
 * @param {string} path
 * @param {{ query?: object, schema: import('zod').ZodTypeAny, limit?: number, signal?: AbortSignal }} options
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function fetchPages(path, { query, schema, limit, signal }) {
  const fetchPage = (page) =>
    apiFetch(path, { query: { ...query, page, pageSize: MAX_PAGE_SIZE }, signal, schema })
  const first = await fetchPage(1)
  const wanted = Math.min(first.total, limit ?? first.total)
  const pages = Math.ceil(wanted / MAX_PAGE_SIZE)
  const rest = await mapLimited(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2),
    CONCURRENCY,
    fetchPage,
  )
  const items = [first, ...rest].flatMap((page) => page.items).slice(0, wanted)
  return { items, total: first.total }
}
