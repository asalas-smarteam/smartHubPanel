import { describe, expect, it } from 'vitest'

import { alertMessage, detectTicketNews, NEWS_KIND, newsKey } from './detect'

const ticket = (id, extra = {}) => ({
  id,
  tenantKey: 'ACME',
  companyName: 'Acme Industrial',
  code: `ACME-${id}`,
  title: `Ticket ${id}`,
  openedAt: '2026-10-21T10:00:00.000Z',
  lastActivityAt: '2026-10-21T10:00:00.000Z',
  hasNews: false,
  ...extra,
})

describe('detectTicketNews', () => {
  it('la primera revisión solo fija el cursor', () => {
    const items = [ticket('1', { hasNews: true, lastActivityAt: '2026-10-21T11:00:00.000Z' })]
    expect(detectTicketNews(null, items)).toEqual({
      cursor: '2026-10-21T11:00:00.000Z',
      news: [],
    })
    // Bandeja vacía: cursor '' y lo siguiente que llegue ya es novedad.
    expect(detectTicketNews(null, [])).toEqual({ cursor: '', news: [] })
    const first = ticket('2', { hasNews: true })
    expect(detectTicketNews('', [first]).news).toEqual([{ kind: NEWS_KIND.TICKET, ticket: first }])
  })

  it('ticket nuevo, respuesta del cliente y acciones de Smarteam (que no avisan)', () => {
    const cursor = '2026-10-21T10:00:00.000Z'
    const nuevo = ticket('n', {
      openedAt: '2026-10-21T10:05:00.000Z',
      lastActivityAt: '2026-10-21T10:05:00.000Z',
      hasNews: true,
    })
    const respuesta = ticket('r', { lastActivityAt: '2026-10-21T10:03:00.000Z', hasNews: true })
    const deSmarteam = ticket('s', { lastActivityAt: '2026-10-21T10:04:00.000Z', hasNews: false })
    const viejaConNovedad = ticket('v', { hasNews: true })
    const result = detectTicketNews(cursor, [nuevo, deSmarteam, respuesta, viejaConNovedad])
    expect(result.news).toEqual([
      { kind: NEWS_KIND.TICKET, ticket: nuevo },
      { kind: NEWS_KIND.REPLY, ticket: respuesta },
    ])
    expect(result.cursor).toBe('2026-10-21T10:05:00.000Z')
    // La siguiente revisión, sin cambios, no repite.
    expect(detectTicketNews(result.cursor, [nuevo, deSmarteam, respuesta]).news).toEqual([])
  })

  it('texto del aviso: uno, o resumen si hay varios', () => {
    const one = { kind: NEWS_KIND.TICKET, ticket: ticket('1') }
    expect(alertMessage([one])).toEqual({
      title: 'Nuevo ticket · Acme Industrial',
      body: 'ACME-1 · Ticket 1',
      href: '/bandeja/ACME/1',
    })
    const reply = { kind: NEWS_KIND.REPLY, ticket: ticket('2', { companyName: null }) }
    expect(alertMessage([reply]).title).toBe('Nueva respuesta · ACME')
    const many = ['1', '2', '3', '4', '5'].map((id) => ({
      kind: NEWS_KIND.REPLY,
      ticket: ticket(id),
    }))
    expect(alertMessage(many)).toEqual({
      title: '5 novedades en Soporte',
      body: 'ACME-1, ACME-2, ACME-3 y 2 más',
      href: '/bandeja',
    })
    expect(newsKey(one)).toBe('ticket:ACME/1@2026-10-21T10:00:00.000Z')
  })
})
