import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { buildTicketFormData } from '@/features/tickets/form-data'
import {
  createdTicketSchema,
  ticketDetailSchema,
  ticketPageSchema,
} from '@/features/tickets/schemas'
import { apiFetch } from '@/lib/api/client'

// API de Soporte del cliente. El tenant lo pone el servidor desde la sesión.

export const SUPPORT_QUERY_KEY = ['support']
const listKey = (params) => [...SUPPORT_QUERY_KEY, 'list', params]
const detailKey = (id) => [...SUPPORT_QUERY_KEY, 'ticket', id]

/** URL de una imagen del ticket (contrato D10). */
export const supportAttachmentUrl = (ticketId, fileId) =>
  `/api/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(fileId)}`

export function useSupportTickets({ page, pageSize, status, category }) {
  const params = { page, pageSize, status: status || undefined, category: category || undefined }
  return useQuery({
    queryKey: listKey(params),
    queryFn: ({ signal }) =>
      apiFetch('/tickets', { query: params, signal, schema: ticketPageSchema }),
    placeholderData: keepPreviousData,
  })
}

export function useSupportTicket(id) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: ({ signal }) =>
      apiFetch(`/tickets/${encodeURIComponent(id)}`, { signal, schema: ticketDetailSchema }),
  })
  // Abrir el detalle marca el ticket como visto en el servidor: la lista debe actualizarse.
  const seenAt = query.dataUpdatedAt
  useEffect(() => {
    if (seenAt) queryClient.invalidateQueries({ queryKey: [...SUPPORT_QUERY_KEY, 'list'] })
  }, [seenAt, queryClient])
  return query
}

function useTicketMutation(id, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Con éxito o con error (p. ej. 409), se vuelve a pedir: no se usa el cuerpo (contrato D7).
    onSettled: () => queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY }),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ images, ...fields }) =>
      apiFetch('/tickets', {
        method: 'POST',
        formData: buildTicketFormData(fields, images),
        schema: createdTicketSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY }),
  })
}

export function useReplyTicket(id) {
  return useTicketMutation(id, ({ body, images }) =>
    apiFetch(`/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      formData: buildTicketFormData({ body }, images),
    }),
  )
}

export function useReopenTicket(id) {
  return useTicketMutation(id, ({ message }) =>
    apiFetch(`/tickets/${encodeURIComponent(id)}/reopen`, { method: 'POST', json: { message } }),
  )
}
