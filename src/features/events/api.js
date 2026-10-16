import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'
import { dayRangeToQuery } from '@/lib/dates'
import { averageDurations } from '@/lib/durations'

import { eventTypeLabel } from './constants'
import {
  collectEventsWithCorrections,
  fetchEventPages,
  findCorrections,
  listEventsWithCorrections,
} from './corrections-api'
import { CORRECTED, withCorrection } from './corrections'
import { eventDetailSchema, eventSchema, staffEventDetailSchema } from './schemas'

// API de Eventos. `scope` sale de useScope(): empresa propia (cliente) o elegida (Smarteam).

export const EVENTS_QUERY_KEY = ['events']

/**
 * Lista de eventos con los corregidos marcados (plan 4k-bis). Con estado "Con error" o
 * "Corregido" la página se arma en el navegador (ver corrections-api.js).
 */
export function useEvents(scope, { page, pageSize, status, type, reference, desde, hasta }) {
  const filters = { status, type, reference, desde, hasta }
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, scope.apiBase, 'list', { page, pageSize, ...filters }],
    queryFn: ({ signal }) => listEventsWithCorrections(scope, filters, { page, pageSize, signal }),
    enabled: scope.ready,
    placeholderData: keepPreviousData,
  })
}

/** Eventos que entran como máximo en la duración promedio (los más recientes del filtro). */
export const DURATIONS_LIMIT = 1000

/** Estados en los que el evento ya terminó (no está en cola ni procesándose). */
export const FINISHED_STATUSES = [
  'completed',
  'destination_created',
  'destination_created_origin_error',
  'errored',
  CORRECTED,
]

/**
 * Duración promedio (de la llegada al último cambio) de los eventos terminados del filtro, por
 * tipo y en total (plan 4l). Con "Con error" o "Corregido" se separan como en la lista; con
 * "En cola" o "Procesando" no hay nada que medir y no se pide nada.
 */
export function useEventDurations(scope, { status, type, reference, desde, hasta }) {
  const filters = { status, type, reference, desde, hasta }
  const measurable = !status || FINISHED_STATUSES.includes(status)
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, scope.apiBase, 'durations', filters],
    queryFn: async ({ signal }) => {
      const splitsErrors = status === 'errored' || status === CORRECTED
      const { items, total, capped } = splitsErrors
        ? await collectEventsWithCorrections(scope, filters, { limit: DURATIONS_LIMIT, signal })
        : await fetchEventPages(
            scope,
            {
              status: status || undefined,
              type: type || undefined,
              reference: reference || undefined,
              ...dayRangeToQuery({ desde, hasta }),
            },
            { limit: DURATIONS_LIMIT, signal },
          )
      const finished = items.filter((event) => FINISHED_STATUSES.includes(event.status))
      const stats = averageDurations(finished, {
        start: (event) => event.createdAt,
        end: (event) => event.updatedAt,
        group: (event) => ({ key: event.type, label: eventTypeLabel(event.type) }),
      })
      return { ...stats, capped: capped ?? total > items.length }
    },
    enabled: scope.ready && measurable,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  })
}

/** Detalle. En la ruta del cliente el esquema descarta `payload` y `audit` si llegaran. */
export function useEvent(scope, id) {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, scope.apiBase, 'detail', id],
    queryFn: async ({ signal }) => {
      const event = await apiFetch(`${scope.apiBase}/events/${encodeURIComponent(id)}`, {
        signal,
        schema: scope.picksTenant ? staffEventDetailSchema : eventDetailSchema,
      })
      // Un error que un reintento posterior dejó bien se muestra como "Corregido" (plan 4k-bis).
      const corrections = await findCorrections(scope, [event], { signal })
      return withCorrection(event, corrections)
    },
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
