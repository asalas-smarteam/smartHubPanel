import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { apiFetch } from '@/lib/api/client'
import { lastDaysRange } from '@/lib/dates'

import { staffTicketMetricsSchema, ticketMetricsSchema } from './schemas'

export const METRICS_QUERY_KEY = ['ticket-metrics']

/**
 * Métricas de tickets de los últimos `days` días (F7).
 * - Cliente: su empresa (`/tickets/metrics`).
 * - Smarteam (`staff`): todas las empresas o `tenantKey`, opcionalmente una `category`.
 */
export function useTicketMetrics({ staff = false, days, tenantKey, category, enabled = true }) {
  const period = useMemo(() => lastDaysRange(days), [days])
  const query = staff
    ? { ...period, tenantKey: tenantKey || undefined, category: category || undefined }
    : period
  return useQuery({
    queryKey: [...METRICS_QUERY_KEY, staff ? 'staff' : 'client', query],
    queryFn: ({ signal }) =>
      apiFetch(staff ? '/staff/tickets/metrics' : '/tickets/metrics', {
        query,
        signal,
        schema: staff ? staffTicketMetricsSchema : ticketMetricsSchema,
      }),
    enabled,
    placeholderData: keepPreviousData,
  })
}
