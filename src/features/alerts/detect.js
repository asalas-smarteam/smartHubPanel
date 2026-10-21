// Avisos de Soporte para Smarteam (plan 4v): qué cambió en la bandeja entre una revisión y otra.
// Se compara con las fechas del propio servidor (lastActivityAt), no con el reloj de la máquina.

/** Cada cuánto se revisa la bandeja mientras los avisos están activados. */
export const ALERTS_INTERVAL_MS = 60_000

/** Cuántos tickets (los de actividad más reciente) se miran en cada revisión. */
export const ALERTS_PAGE_SIZE = 25

export const NEWS_KIND = Object.freeze({ TICKET: 'ticket', REPLY: 'reply' })

const latestActivity = (items, from) =>
  items.reduce((max, ticket) => (ticket.lastActivityAt > max ? ticket.lastActivityAt : max), from)

/**
 * Novedades desde la revisión anterior.
 * - Ticket nuevo: se abrió después del cursor.
 * - Respuesta: el ticket tiene novedad del cliente (`hasNews`) y actividad después del cursor.
 * Las acciones de Smarteam no dejan `hasNews`, así que no avisan.
 * La primera revisión (`cursor` null) solo fija el cursor: lo viejo no avisa.
 * @param {string | null} cursor `lastActivityAt` más reciente de la revisión anterior
 * @param {Array<object>} items tickets de la bandeja (D2)
 * @returns {{ cursor: string, news: Array<{ kind: string, ticket: object }> }}
 */
export function detectTicketNews(cursor, items) {
  if (cursor === null || cursor === undefined) {
    return { cursor: latestActivity(items, ''), news: [] }
  }
  const news = []
  for (const ticket of items) {
    if (ticket.openedAt > cursor) news.push({ kind: NEWS_KIND.TICKET, ticket })
    else if (ticket.hasNews && ticket.lastActivityAt > cursor) {
      news.push({ kind: NEWS_KIND.REPLY, ticket })
    }
  }
  return { cursor: latestActivity(items, cursor), news }
}

/** Identificador de una novedad (para no avisarla dos veces entre pestañas). */
export const newsKey = ({ kind, ticket }) =>
  `${kind}:${ticket.tenantKey}/${ticket.id}@${ticket.lastActivityAt}`

export const ticketHref = (ticket) =>
  `/bandeja/${encodeURIComponent(ticket.tenantKey)}/${encodeURIComponent(ticket.id)}`

const companyOf = (ticket) => ticket.companyName ?? ticket.tenantKey

/**
 * Texto del aviso: uno por novedad, o un resumen si hay varias.
 * @param {Array<{ kind: string, ticket: object }>} news (al menos una)
 */
export function alertMessage(news) {
  if (news.length === 1) {
    const [{ kind, ticket }] = news
    const what = kind === NEWS_KIND.TICKET ? 'Nuevo ticket' : 'Nueva respuesta'
    return {
      title: `${what} · ${companyOf(ticket)}`,
      body: `${ticket.code} · ${ticket.title}`,
      href: ticketHref(ticket),
    }
  }
  const codes = news.slice(0, 3).map(({ ticket }) => ticket.code)
  const more = news.length > 3 ? ` y ${news.length - 3} más` : ''
  return {
    title: `${news.length} novedades en Soporte`,
    body: `${codes.join(', ')}${more}`,
    href: '/bandeja',
  }
}
