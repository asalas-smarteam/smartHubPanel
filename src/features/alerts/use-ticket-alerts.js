import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { INBOX_QUERY_KEY } from '@/features/inbox/api'
import { inboxPageSchema } from '@/features/tickets/schemas'
import { apiFetch } from '@/lib/api/client'

import {
  ALERTS_INTERVAL_MS,
  ALERTS_PAGE_SIZE,
  alertMessage,
  detectTicketNews,
  newsKey,
} from './detect'
import { claimAlerts, showSystemNotification } from './notify'
import { playChime } from './sound'

export const ALERTS_QUERY_KEY = [...INBOX_QUERY_KEY, 'alerts']

/**
 * Revisa la bandeja cada minuto (también con la pestaña en segundo plano) y avisa de tickets
 * nuevos y respuestas del cliente: un sonido, notificación del sistema, aviso en el panel y
 * Bandeja al día.
 * @param {{ enabled: boolean }} options
 */
export function useTicketAlerts({ enabled }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cursor = useRef(null)

  const query = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: ({ signal }) =>
      apiFetch('/staff/tickets', {
        query: { page: 1, pageSize: ALERTS_PAGE_SIZE },
        signal,
        schema: inboxPageSchema,
      }),
    enabled,
    refetchInterval: ALERTS_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })

  // Al apagar los avisos, la próxima vez se vuelve a empezar sin avisar lo viejo.
  useEffect(() => {
    if (!enabled) cursor.current = null
  }, [enabled])

  const data = enabled ? query.data : undefined
  useEffect(() => {
    if (!data) return
    const { cursor: next, news } = detectTicketNews(cursor.current, data.items)
    cursor.current = next
    if (news.length === 0) return

    queryClient.invalidateQueries({ queryKey: [...INBOX_QUERY_KEY, 'list'] })
    queryClient.invalidateQueries({ queryKey: [...INBOX_QUERY_KEY, 'summary'] })

    const fresh = new Set(claimAlerts(news.map(newsKey)))
    const toAlert = news.filter((item) => fresh.has(newsKey(item)))
    if (toAlert.length === 0) return

    const message = alertMessage(toAlert)
    const open = () => navigate(message.href)
    // Un solo sonido: el timbre del panel si el navegador ya lo deja (hubo un clic); si no, el de
    // la notificación del sistema, que suena aunque la pestaña esté oculta o recién recargada.
    const chimed = playChime()
    toast.info(message.title, {
      description: message.body,
      action: { label: 'Ver', onClick: open },
    })
    showSystemNotification({
      title: message.title,
      body: message.body,
      tag: newsKey(toAlert[0]),
      silent: chimed,
      onClick: open,
    })
  }, [data, queryClient, navigate])
}
