import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SlaCard } from './sla-card'

// Miércoles 4 de noviembre, 12:00 en Costa Rica (UTC−6). Fechas y "hoy/mañana/ayer" van en
// hora de Costa Rica, sea cual sea la zona del navegador.
const NOW = Date.parse('2026-11-04T18:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

function renderCard(ticket) {
  render(<SlaCard ticket={{ firstResponseAt: null, resolvedAt: null, ...ticket }} />)
  const card = screen.getByRole('region', { name: 'SLA' })
  const goal = (label) => within(card).getByText(label).nextElementSibling
  return { card, goal }
}

describe('SlaCard', () => {
  it('vencida y pendiente: cuándo vence (hoy, mañana, ayer) y cuánto falta o pasó', () => {
    // Abierto el martes a las 10:00: la respuesta vencía el martes a las 12:00 (van 9 h hábiles
    // de atraso, un día hábil) y la resolución vence el jueves a las 10:00.
    const { card, goal } = renderCard({ openedAt: '2026-11-03T16:00:00.000Z', status: 'abierto' })
    expect(goal('Primera respuesta')).toHaveTextContent('venció ayer 12:00 · hace 1 d')
    expect(goal('Primera respuesta')).toHaveClass('text-status-error-fg')
    expect(goal('Resolución')).toHaveTextContent('vence mañana 10:00 · en 7 h')
    expect(card).toHaveTextContent(
      'Metas en horario hábil: respuesta 2 h, resolución 2 días (L-V 8:00 a 17:00, hora de Costa Rica).',
    )
  })

  it('pendiente hoy y por vencer en ámbar', () => {
    const { goal } = renderCard({ openedAt: '2026-11-04T16:10:00.000Z', status: 'abierto' })
    expect(goal('Primera respuesta')).toHaveTextContent('vence hoy 12:10 · en 10 min')
    expect(goal('Primera respuesta')).toHaveClass('text-status-waiting-fg')
  })

  it('cumplida y fuera de plazo: cuánto tomó', () => {
    const { goal } = renderCard({
      openedAt: '2026-10-28T15:00:00.000Z',
      firstResponseAt: '2026-10-28T16:05:00.000Z',
      resolvedAt: '2026-10-30T19:00:00.000Z',
      status: 'resuelto',
    })
    expect(goal('Primera respuesta')).toHaveTextContent('cumplida en 1 h 05')
    expect(goal('Resolución')).toHaveTextContent('fuera de plazo: 2 d 4 h')
  })

  it('un ticket reabierto vuelve a contar la resolución', () => {
    const { goal } = renderCard({
      openedAt: '2026-11-04T15:00:00.000Z',
      firstResponseAt: '2026-11-04T15:30:00.000Z',
      resolvedAt: '2026-11-04T16:00:00.000Z',
      status: 'en_progreso',
    })
    expect(goal('Resolución')).toHaveTextContent('vence vie 6 nov, 09:00 · en 1 d 6 h')
  })

  it('"hoy" y "mañana" según el día de Costa Rica, no el del navegador', () => {
    // Martes 3 a las 23:30 en Costa Rica (ya miércoles en UTC). Abierto el martes a las 16:00:
    // la respuesta vence el miércoles a las 9:00, "mañana" para Costa Rica.
    vi.setSystemTime(Date.parse('2026-11-04T05:30:00.000Z'))
    const { goal } = renderCard({ openedAt: '2026-11-03T22:00:00.000Z', status: 'abierto' })
    expect(goal('Primera respuesta')).toHaveTextContent('vence mañana 09:00 · en 1 h')
  })

  it('fecha de apertura inválida: "—" en las dos metas', () => {
    const { goal } = renderCard({ openedAt: '', status: 'abierto' })
    expect(goal('Primera respuesta')).toHaveTextContent(/^—$/)
    expect(goal('Resolución')).toHaveTextContent(/^—$/)
  })
})
