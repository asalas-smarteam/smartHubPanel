import { useQuery } from '@tanstack/react-query'

import { eventSummaryQuery } from '@/features/events/api'
import { syncSummaryQuery } from '@/features/syncs/api'

/**
 * Resumen del evento o la sync que se va a enlazar a un ticket nuevo (plan 4c §5.5).
 * Se pide a la API: no viaja en la URL. Un 404 = no existe en la empresa del cliente.
 * @param {{ contextType: 'webhookEvent' | 'syncLog', contextId: string } | null} context
 */
export function useLinkedRecord(context) {
  const options =
    context?.contextType === 'syncLog'
      ? syncSummaryQuery(context.contextId)
      : eventSummaryQuery(context?.contextId ?? '')
  return useQuery({ ...options, enabled: Boolean(context) })
}
