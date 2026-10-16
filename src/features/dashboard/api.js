import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { apiFetch } from '@/lib/api/client'
import { lastDaysRange } from '@/lib/dates'

import { applyCorrectionsToSummary } from '@/features/events/corrections'
import { ERRORS_LIMIT, fetchEventPages, findCorrections } from '@/features/events/corrections-api'

import { integrationSummarySchema } from './schemas'

export const DASHBOARD_QUERY_KEY = ['dashboard']

/**
 * Resumen de integración de los últimos `days` días (F1). `scope` sale de useScope():
 * su empresa (cliente) o la elegida (Smarteam). Los errores corregidos se cuentan aparte.
 */
export function useIntegrationSummary(scope, days) {
  const period = useMemo(() => lastDaysRange(days), [days])
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, scope.apiBase, 'integration', period],
    queryFn: async ({ signal }) => {
      const summary = await apiFetch(`${scope.apiBase}/dashboard/integration`, {
        query: period,
        signal,
        schema: integrationSummarySchema,
      })
      // Corregidos (plan 4k-bis): errores del período que un reintento dejó bien.
      if (summary.totals.errored === 0) return summary
      try {
        const { items, total } = await fetchEventPages(
          scope,
          { status: 'errored', from: period.from, to: period.to },
          { limit: ERRORS_LIMIT, signal },
        )
        const corrections = await findCorrections(scope, items, { signal })
        const corrected = items.filter((event) => corrections.has(event.id))
        return {
          ...applyCorrectionsToSummary(summary, corrected),
          correctionsCapped: total > items.length,
        }
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        return { ...summary, correctionsFailed: true }
      }
    },
    enabled: scope.ready,
    placeholderData: keepPreviousData,
  })
}
