// Pedidos para calcular "Corregido" en el front (plan 4k-bis). Solo usa la lista de eventos de
// la API (filtros de estado, tipo, referencia y fechas; páginas de 100).

import { apiFetch } from '@/lib/api/client'
import { fetchPages, mapLimited } from '@/lib/api/fetch-pages'
import { dayRangeToQuery } from '@/lib/dates'

import { CORRECTED, matchCorrections, SUCCESS_STATUSES, withCorrection } from './corrections'
import { eventPageSchema } from './schemas'

const CONCURRENCY = 4
/** Errores que se revisan como máximo para los filtros "Con error" y "Corregido". */
export const ERRORS_LIMIT = 1000
/** Con hasta tantas referencias distintas se pregunta por cada una; con más, en bloque. */
const PER_REFERENCE_MAX = 40
/** Tope de eventos buenos que se traen en bloque por estado. */
const SUCCESS_LIMIT = 5000

/**
 * Todas las páginas de la lista con `query` (hasta `limit` eventos).
 * @returns {Promise<{ items: object[], total: number }>}
 */
export function fetchEventPages(scope, query, { limit, signal } = {}) {
  return fetchPages(`${scope.apiBase}/events`, { query, schema: eventPageSchema, limit, signal })
}

/**
 * Qué errores de `errors` se corrigieron. Con pocas referencias pregunta por cada una; con
 * muchas, trae los eventos buenos desde el error más antiguo (del mismo tipo si es uno solo).
 * @returns {Promise<Map<string, { id: string, at: string }>>}
 */
export async function findCorrections(scope, errors, { signal } = {}) {
  const pending = errors.filter((event) => event.status === 'errored' && event.reference)
  if (pending.length === 0) return new Map()
  const references = [...new Set(pending.map((event) => event.reference))]
  let candidates
  if (references.length <= PER_REFERENCE_MAX) {
    const lists = await mapLimited(references, CONCURRENCY, (reference) =>
      fetchEventPages(scope, { reference }, { limit: 500, signal }),
    )
    candidates = lists.flatMap((list) => list.items)
  } else {
    const since = pending.reduce(
      (min, event) => (event.createdAt < min ? event.createdAt : min),
      pending[0].createdAt,
    )
    const types = new Set(pending.map((event) => event.type))
    const lists = await mapLimited(SUCCESS_STATUSES, 2, (status) =>
      fetchEventPages(
        scope,
        { status, from: since, type: types.size === 1 ? [...types][0] : undefined },
        { limit: SUCCESS_LIMIT, signal },
      ),
    )
    candidates = lists.flatMap((list) => list.items)
  }
  return matchCorrections(pending, candidates)
}

const listQuery = ({ type, reference, desde, hasta }) => ({
  type: type || undefined,
  reference: reference || undefined,
  ...dayRangeToQuery({ desde, hasta }),
})

/**
 * Eventos del filtro con los corregidos marcados, como una página de la API.
 * - Estado "Con error" o "Corregido": se traen los errores del filtro (hasta ERRORS_LIMIT), se
 *   separan y se pagina en el navegador. `capped` avisa si había más errores que el tope.
 * - Otro estado o sin estado: la página de la API, marcando los errores que se corrigieron.
 */
export async function listEventsWithCorrections(scope, filters, { page, pageSize, signal }) {
  const base = listQuery(filters)
  if (filters.status === 'errored' || filters.status === CORRECTED) {
    const { items, total } = await fetchEventPages(
      scope,
      { ...base, status: 'errored' },
      { limit: ERRORS_LIMIT, signal },
    )
    const corrections = await findCorrections(scope, items, { signal })
    const wanted = items
      .map((event) => withCorrection(event, corrections))
      .filter((event) => event.status === filters.status)
    const start = (page - 1) * pageSize
    return {
      items: wanted.slice(start, start + pageSize),
      page,
      pageSize,
      total: wanted.length,
      capped: total > items.length,
    }
  }
  const data = await apiFetch(`${scope.apiBase}/events`, {
    query: { ...base, status: filters.status || undefined, page, pageSize },
    signal,
    schema: eventPageSchema,
  })
  const corrections = await findCorrections(scope, data.items, { signal })
  return { ...data, items: data.items.map((event) => withCorrection(event, corrections)) }
}

/**
 * Todos los eventos del filtro (hasta `limit`) con los corregidos marcados. Para exportar.
 * `capped`: el filtro tenía más eventos de los que se trajeron.
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function collectEventsWithCorrections(scope, filters, { limit, signal }) {
  const base = listQuery(filters)
  if (filters.status === 'errored' || filters.status === CORRECTED) {
    const { items, total: errors } = await fetchEventPages(
      scope,
      { ...base, status: 'errored' },
      { limit: ERRORS_LIMIT, signal },
    )
    const corrections = await findCorrections(scope, items, { signal })
    const wanted = items
      .map((event) => withCorrection(event, corrections))
      .filter((event) => event.status === filters.status)
    return {
      items: wanted.slice(0, limit),
      total: wanted.length,
      capped: errors > items.length || wanted.length > limit,
    }
  }
  const { items, total } = await fetchEventPages(
    scope,
    { ...base, status: filters.status || undefined },
    { limit, signal },
  )
  const corrections = await findCorrections(scope, items, { signal })
  return {
    items: items.map((event) => withCorrection(event, corrections)),
    total,
    capped: total > items.length,
  }
}
