import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { z } from 'zod'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25
/** Eventos y syncs: la API no deja pasar de página × tamaño > 10 000 (contrato E3/E5). */
export const RESULTS_WINDOW = 10000
export const DATE_WINDOW_HINT = 'Para ver registros más antiguos, filtra por fechas.'

/** Esquema de una página del servidor: `{ items, page, pageSize, total }`. */
export function paginatedSchema(itemSchema) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
  })
}

/**
 * Filtro de la URL solo si es un valor conocido; si no, '' (sin filtro). Así una URL editada
 * a mano no termina en un 400 del backend.
 * @param {string} value
 * @param {readonly string[]} allowed
 */
export function pickOption(value, allowed) {
  return allowed.includes(value) ? value : ''
}

/** @param {string | null} value */
export function parsePage(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 ? number : 1
}

/** @param {string | null} value */
export function parsePageSize(value) {
  const number = Number(value)
  return PAGE_SIZE_OPTIONS.includes(number) ? number : DEFAULT_PAGE_SIZE
}

/**
 * Página, tamaño y filtros guardados en la URL (`?page=2&pageSize=25&tenantKey=X`),
 * para que recargar o compartir el link mantenga la vista.
 * - `setPagination({ page, pageSize })`: si cambia el tamaño, vuelve a la página 1.
 * - `setFilter(name, value)`: cambia un filtro y vuelve a la página 1.
 */
export function usePaginationParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('pageSize'))

  const setPagination = useCallback(
    (next) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        const previousSize = parsePageSize(previous.get('pageSize'))
        const nextSize = next.pageSize ?? previousSize
        const nextPage = nextSize !== previousSize ? 1 : (next.page ?? 1)
        setOrDelete(params, 'page', nextPage === 1 ? null : nextPage)
        setOrDelete(params, 'pageSize', nextSize === DEFAULT_PAGE_SIZE ? null : nextSize)
        return params
      })
    },
    [setSearchParams],
  )

  const setFilter = useCallback(
    (name, value) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        setOrDelete(params, name, value)
        params.delete('page')
        return params
      })
    },
    [setSearchParams],
  )

  const getFilter = useCallback((name) => searchParams.get(name) ?? '', [searchParams])

  return { page, pageSize, setPagination, setFilter, getFilter }
}

function setOrDelete(params, name, value) {
  if (value === null || value === undefined || value === '') params.delete(name)
  else params.set(name, String(value))
}
