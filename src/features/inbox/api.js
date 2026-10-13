import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { buildTicketFormData } from '@/features/tickets/form-data'
import {
  inboxPageSchema,
  inboxSummarySchema,
  staffTicketDetailSchema,
} from '@/features/tickets/schemas'
import { apiFetch } from '@/lib/api/client'

// API de Soporte de Smarteam (permiso staff.tickets).

export const INBOX_QUERY_KEY = ['inbox']

const ticketPath = (tenantKey, id) =>
  `/staff/tenants/${encodeURIComponent(tenantKey)}/tickets/${encodeURIComponent(id)}`

/** URL de una imagen del ticket para Smarteam (contrato D10). */
export const staffAttachmentUrl = (tenantKey, id, fileId) =>
  `/api${ticketPath(tenantKey, id)}/attachments/${encodeURIComponent(fileId)}`

export function useInboxTickets({ page, pageSize, status, tenantKey, category }) {
  const params = {
    page,
    pageSize,
    status: status || undefined,
    tenantKey: tenantKey || undefined,
    category: category || undefined,
  }
  return useQuery({
    queryKey: [...INBOX_QUERY_KEY, 'list', params],
    queryFn: ({ signal }) =>
      apiFetch('/staff/tickets', { query: params, signal, schema: inboxPageSchema }),
    placeholderData: keepPreviousData,
  })
}

export function useInboxSummary() {
  return useQuery({
    queryKey: [...INBOX_QUERY_KEY, 'summary'],
    queryFn: ({ signal }) =>
      apiFetch('/staff/tickets/summary', { signal, schema: inboxSummarySchema }),
  })
}

export function useStaffTicket(tenantKey, id) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [...INBOX_QUERY_KEY, 'ticket', tenantKey, id],
    queryFn: ({ signal }) =>
      apiFetch(ticketPath(tenantKey, id), { signal, schema: staffTicketDetailSchema }),
  })
  // Abrir el detalle lo marca como visto por Smarteam: la bandeja debe actualizar la novedad.
  const seenAt = query.dataUpdatedAt
  useEffect(() => {
    if (seenAt) queryClient.invalidateQueries({ queryKey: [...INBOX_QUERY_KEY, 'list'] })
  }, [seenAt, queryClient])
  return query
}

/** Mutaciones del detalle: con éxito o error (p. ej. 409) se vuelve a pedir todo (contrato D7). */
export function useStaffTicketActions(tenantKey, id) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
  const path = ticketPath(tenantKey, id)

  const reply = useMutation({
    mutationFn: ({ body, images }) =>
      apiFetch(`${path}/messages`, {
        method: 'POST',
        formData: buildTicketFormData({ body }, images),
      }),
    onSettled: refresh,
  })
  const setStatus = useMutation({
    mutationFn: (to) => apiFetch(`${path}/status`, { method: 'POST', json: { to } }),
    onSettled: refresh,
  })
  const resolve = useMutation({
    mutationFn: ({ message, internalResolution, images }) =>
      apiFetch(`${path}/resolve`, {
        method: 'POST',
        formData: buildTicketFormData({ message, internalResolution }, images),
      }),
    onSettled: refresh,
  })
  const updateInternalResolution = useMutation({
    mutationFn: (text) =>
      apiFetch(`${path}/internal-resolution`, { method: 'PUT', json: { text } }),
    onSettled: refresh,
  })

  return { reply, setStatus, resolve, updateInternalResolution }
}
