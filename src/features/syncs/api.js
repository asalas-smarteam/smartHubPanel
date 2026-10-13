import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'
import { dayRangeToQuery } from '@/lib/dates'

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

export function useSyncs(scope, { page, pageSize, taskId, status, desde, hasta }) {
  const params = {
    page,
    pageSize,
    taskId: taskId || undefined,
    status: status || undefined,
    ...dayRangeToQuery({ desde, hasta }),
  }
  return useQuery({
    queryKey: [...SYNCS_QUERY_KEY, scope.apiBase, 'list', params],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/syncs`, { query: params, signal, schema: syncPageSchema }),
    enabled: scope.ready,
    placeholderData: keepPreviousData,
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
