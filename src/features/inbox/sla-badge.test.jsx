import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SlaBadge } from './sla-badge'

// Miércoles 4 de noviembre, 10:00 en Costa Rica (UTC−6). Las fechas se muestran en hora de
// Costa Rica, sea cual sea la zona del navegador.
const NOW = Date.parse('2026-11-04T16:00:00.000Z')

const ticket = (overrides) => ({
  openedAt: '2026-11-04T15:00:00.000Z',
  firstResponseAt: null,
  resolvedAt: null,
  status: 'en_progreso',
  ...overrides,
})

function renderBadge(overrides) {
  render(<SlaBadge ticket={ticket(overrides)} now={NOW} />)
  return document.querySelector('[data-slot="badge"]')
}

describe('SlaBadge', () => {
  it('pendiente: cuenta regresiva de la primera respuesta, neutro, con el vencimiento', () => {
    const badge = renderBadge()
    expect(screen.getByText('Responder en 1 h')).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-sla-state', 'pending')
    expect(badge).toHaveClass('bg-status-muted-bg', 'tabular-nums', 'whitespace-nowrap')
    // Abierto a las 9:00 de Costa Rica: vence a las 11:00.
    expect(badge).toHaveAttribute('title', 'Vence: mié 4 nov, 11:00')
  })

  it('por vencer (30 min o menos): ámbar y avisa a lectores de pantalla', () => {
    const badge = renderBadge({ openedAt: '2026-11-04T14:10:00.000Z' })
    expect(screen.getByText('Responder en 10 min')).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-sla-state', 'warning')
    expect(badge).toHaveClass('bg-status-waiting-bg', 'text-status-waiting-fg')
    expect(badge).toHaveTextContent(/^Por vencer: Responder en 10 min\. Vence:/)
  })

  it('vencida: rojo y "Respuesta vencida hace …"', () => {
    // Abierto el martes a las 10:00: vencía el martes a las 12:00; ya van 7 h hábiles de atraso.
    const badge = renderBadge({ openedAt: '2026-11-03T16:00:00.000Z' })
    expect(screen.getByText('Respuesta vencida hace 7 h')).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-sla-state', 'overdue')
    expect(badge).toHaveClass('bg-status-error-bg', 'text-status-error-fg')
    expect(badge).toHaveAttribute('title', 'Venció: mar 3 nov, 12:00')
  })

  it('con primera respuesta: cuenta la resolución', () => {
    renderBadge({ firstResponseAt: '2026-11-04T15:30:00.000Z' })
    expect(screen.getByText('Resolver en 1 d 8 h')).toBeInTheDocument()
  })

  it('resuelto a tiempo: gris tenue con un check', () => {
    const badge = renderBadge({
      openedAt: '2026-11-03T15:00:00.000Z',
      firstResponseAt: '2026-11-03T15:20:00.000Z',
      resolvedAt: '2026-11-03T20:00:00.000Z',
      status: 'resuelto',
    })
    expect(screen.getByText('En plazo')).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-sla-state', 'met')
    expect(badge).toHaveClass('text-muted-foreground')
    expect(badge.querySelector('svg')).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Resuelto en 5 h')
  })

  it('resuelto fuera de plazo: texto tenue, sin check', () => {
    const badge = renderBadge({
      openedAt: '2026-10-28T15:00:00.000Z',
      firstResponseAt: '2026-10-28T15:20:00.000Z',
      resolvedAt: '2026-11-02T15:00:00.000Z',
      status: 'resuelto',
    })
    expect(screen.getByText('Fuera de plazo')).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-sla-state', 'missed')
    expect(badge).toHaveClass('text-muted-foreground/80')
    expect(badge.querySelector('svg')).not.toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Resuelto en 3 d; vencía: vie 30 oct, 09:00')
  })

  it('fecha de apertura inválida: "—" tenue, sin title ni error', () => {
    render(<SlaBadge ticket={ticket({ openedAt: 'no-es-fecha' })} now={NOW} />)
    const badge = document.querySelector('[data-sla-state="unknown"]')
    expect(badge).toHaveTextContent('—SLA sin datos')
    expect(badge).toHaveClass('text-muted-foreground')
    expect(badge).not.toHaveAttribute('title')
  })
})
