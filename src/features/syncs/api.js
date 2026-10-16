import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'
import { fetchPages } from '@/lib/api/fetch-pages'
import { dayRangeToQuery } from '@/lib/dates'
import { averageDurations } from '@/lib/durations'

import { MISSING_TASK_LABEL } from './constants'
import { syncDetailSchema, syncPageSchema, syncSchema, syncTasksSchema } from './schemas'

// API de Syncs. `scope` sale de useScope(): empresa propia (cliente) o elegida (Smarteam).

export const SYNCS_QUERY_KEY = ['syncs']

export function useSyncTasks(scope) {
  return useQuery({
    queryKey: [...SYNCS_QUERY_KEY, scope.apiBase, 'tasks'],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/sync-tasks`, { signal, schema: syncTasksSchema }).then(
        (response) => response.items,
      ),
    enabled: scope.ready,
    staleTime: 5 * 60 * 1000,
  })
}

const listQuery = ({ taskId, status, desde, hasta, hideEmpty }) => ({
  // G2: solo corridas con algo procesado; sin el parámetro, todas.
  hideEmpty: hideEmpty ? 'true' : undefined,
  taskId: taskId || undefined,
  status: status || undefined,
  ...dayRangeToQuery({ desde, hasta }),
})

export function useSyncs(scope, { page, pageSize, ...filters }) {
  const params = { page, pageSize, ...listQuery(filters) }
  return useQuery({
    queryKey: [...SYNCS_QUERY_KEY, scope.apiBase, 'list', params],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/syncs`, { query: params, signal, schema: syncPageSchema }),
    enabled: scope.ready,
    placeholderData: keepPreviousData,
  })
}

/** Corridas que entran como máximo en la duración promedio (las más recientes del filtro). */
export const DURATIONS_LIMIT = 1000

/**
 * Duración promedio de las corridas terminadas del filtro, por tarea y en total (plan 4l).
 * Con el filtro "En curso" no hay nada que medir y no se pide nada.
 */
export function useSyncDurations(scope, filters) {
  const query = listQuery(filters)
  return useQuery({
    queryKey: [...SYNCS_QUERY_KEY, scope.apiBase, 'durations', query],
    queryFn: async ({ signal }) => {
      const { items, total } = await fetchPages(`${scope.apiBase}/syncs`, {
        query,
        schema: syncPageSchema,
        limit: DURATIONS_LIMIT,
        signal,
      })
      const finished = items.filter((sync) => sync.status !== 'running' && sync.finishedAt)
      const stats = averageDurations(finished, {
        start: (sync) => sync.startedAt,
        end: (sync) => sync.finishedAt,
        group: (sync) => ({
          key: sync.task?.id ?? '',
          label: sync.task?.name ?? MISSING_TASK_LABEL,
        }),
      })
      return { ...stats, capped: total > items.length }
    },
    enabled: scope.ready && filters.status !== 'running',
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

/** Detalle con su página de errores (contrato E7). */
export function useSync(scope, id, { errorsPage, errorsPageSize }) {
  const params = { errorsPage, errorsPageSize }
  return useQuery({
    queryKey: [...SYNCS_QUERY_KEY, scope.apiBase, 'detail', id, params],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/syncs/${encodeURIComponent(id)}`, {
        query: params,
        signal,
        schema: syncDetailSchema,
      }),
    enabled: scope.ready,
    placeholderData: keepPreviousData,
  })
}

/** Resumen de una corrida de la empresa del cliente (para "Nuevo ticket" con contexto). */
export function syncSummaryQuery(id) {
  return {
    queryKey: [...SYNCS_QUERY_KEY, '', 'summary', id],
    queryFn: ({ signal }) =>
      apiFetch(`/syncs/${encodeURIComponent(id)}`, {
        query: { errorsPageSize: 1 },
        signal,
        schema: syncSchema,
      }),
    retry: false,
  }
}
