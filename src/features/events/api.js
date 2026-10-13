import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'
import { dayRangeToQuery } from '@/lib/dates'

import { eventPageSchema, eventSchema, staffEventDetailSchema } from './schemas'

// API de Eventos. `scope` sale de useScope(): empresa propia (cliente) o elegida (Smarteam).

export const EVENTS_QUERY_KEY = ['events']

export function useEvents(scope, { page, pageSize, status, type, reference, desde, hasta }) {
  const params = {
    page,
    pageSize,
    status: status || undefined,
    type: type || undefined,
    reference: reference || undefined,
    ...dayRangeToQuery({ desde, hasta }),
  }
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, scope.apiBase, 'list', params],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/events`, { query: params, signal, schema: eventPageSchema }),
    enabled: scope.ready,
    placeholderData: keepPreviousData,
  })
}

/** Detalle. En la ruta del cliente el esquema descarta `payload` y `audit` si llegaran. */
export function useEvent(scope, id) {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, scope.apiBase, 'detail', id],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/events/${encodeURIComponent(id)}`, {
        signal,
        schema: scope.picksTenant ? staffEventDetailSchema : eventSchema,
      }),
    enabled: scope.ready,
  })
}

/** Resumen de un evento de la empresa del cliente (para "Nuevo ticket" con contexto). */
export function eventSummaryQuery(id) {
  return {
    queryKey: [...EVENTS_QUERY_KEY, '', 'detail', id],
    queryFn: ({ signal }) =>
      apiFetch(`/events/${encodeURIComponent(id)}`, { signal, schema: eventSchema }),
    retry: false,
  }
}
