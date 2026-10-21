// Planes 4v y 4w: avisos de tickets nuevos y respuestas para Smarteam (sonido y notificación).
import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSoundForTests } from '@/features/alerts/sound'
import { ALERTS_QUERY_KEY } from '@/features/alerts/use-ticket-alerts'
import { addMessage, changeStatus, getTickets } from '@/mocks/tickets-db'
import { DEMO_ACCOUNTS, renderApp } from '@/test/render'
import { recordRequests } from '@/test/requests'

const client = DEMO_ACCOUNTS.clienteUsuario.email
const staff = DEMO_ACCOUNTS.smarteam.email

let shown
let nextPermission

class FakeNotification {
  static permission = 'default'
  static requestPermission = vi.fn(async () => {
    FakeNotification.permission = nextPermission
    return nextPermission
  })
  constructor(title, options) {
    this.title = title
    this.options = options
    shown.push(this)
  }
  close() {}
}

// Web Audio simulado: cuenta cuántas notas suenan.
let notes
class FakeAudioContext {
  state = 'suspended'
  currentTime = 0
  destination = {}
  async resume() {
    this.state = 'running'
  }
  createOscillator() {
    return { frequency: {}, connect() {}, start: () => notes.push(1), stop() {} }
  }
  createGain() {
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
    return { gain: param, connect() {} }
  }
}
const chimes = () => notes.length / 2

beforeEach(() => {
  notes = []
  resetSoundForTests()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  shown = []
  nextPermission = 'granted'
  FakeNotification.permission = 'default'
  FakeNotification.requestPermission.mockClear()
  vi.stubGlobal('Notification', FakeNotification)
})

afterEach(() => {
  toast.dismiss()
  vi.unstubAllGlobals()
  window.localStorage.removeItem('panel-alerts')
  window.localStorage.removeItem('panel-alerts-seen')
})

/** Abre el panel como Smarteam, activa los avisos y espera la primera revisión (sin avisos). */
async function enableAlerts() {
  const app = renderApp({ route: '/usuarios', session: staff })
  await app.user.click(await screen.findByRole('button', { name: 'Avisos' }))
  await waitFor(() =>
    expect(app.queryClient.getQueryState(ALERTS_QUERY_KEY)?.dataUpdatedAt).toBeGreaterThan(0),
  )
  return app
}

async function check(app) {
  await app.queryClient.refetchQueries({ queryKey: ALERTS_QUERY_KEY })
}

function addNewTicket() {
  const base = getTickets().find((ticket) => ticket.tenantKey === 'ACME')
  const now = new Date().toISOString()
  const ticket = {
    ...structuredClone(base),
    id: 'tk-aviso-nuevo',
    code: 'ACME-0999',
    title: 'No sincroniza cotizaciones',
    status: 'abierto',
    messages: [],
    openedAt: now,
    lastActivityAt: now,
    resolvedAt: null,
    firstResponseAt: null,
    lastPublicAuthorType: 'cliente',
    clientLastSeenAt: now,
    staffLastSeenAt: null,
  }
  getTickets().push(ticket)
  return ticket
}

describe('avisos de tickets (Smarteam)', () => {
  it('ticket nuevo: notificación del sistema y aviso en el panel; lo viejo no avisa', async () => {
    const app = await enableAlerts()
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Avisos' })).toHaveAttribute('aria-pressed', 'true')
    expect(shown).toHaveLength(0)

    addNewTicket()
    await check(app)
    await waitFor(() => expect(shown).toHaveLength(1))
    expect(shown[0].title).toBe('Nuevo ticket · Acme Industrial')
    expect(shown[0].options.body).toBe('ACME-0999 · No sincroniza cotizaciones')
    // Un solo sonido: el timbre (hubo clic en "Avisos"); la notificación sale en silencio.
    expect(chimes()).toBe(1)
    expect(shown[0].options.silent).toBe(true)
    expect(await screen.findByText('Nuevo ticket · Acme Industrial')).toBeInTheDocument()

    // Clic en la notificación: abre el ticket.
    shown[0].onclick()
    await waitFor(() =>
      expect(app.router.state.location.pathname).toBe('/bandeja/ACME/tk-aviso-nuevo'),
    )

    // Sin cambios no se repite ni suena.
    await check(app)
    expect(shown).toHaveLength(1)
    expect(chimes()).toBe(1)
  })

  it('respuesta del cliente avisa; una acción de Smarteam no', async () => {
    const app = await enableAlerts()
    const ticket = getTickets().find((t) => t.tenantKey === 'ACME' && t.status !== 'cerrado')

    changeStatus(ticket, 'en_progreso', { byType: 'smarteam', user: { name: 'Soporte' } })
    ticket.staffLastSeenAt = ticket.lastActivityAt
    await check(app)
    expect(shown).toHaveLength(0)
    expect(chimes()).toBe(0)

    addMessage(ticket, { authorType: 'cliente', user: { id: 'u1', name: 'Cliente' }, body: 'Hola' })
    await check(app)
    await waitFor(() => expect(shown).toHaveLength(1))
    expect(shown[0].title).toBe('Nueva respuesta · Acme Industrial')
  })

  it('recién recargada (sin clic): suena la notificación del sistema; el clic habilita el timbre', async () => {
    window.localStorage.setItem('panel-alerts', 'on')
    FakeNotification.permission = 'granted'
    const app = renderApp({ route: '/usuarios', session: staff })
    await waitFor(() =>
      expect(app.queryClient.getQueryState(ALERTS_QUERY_KEY)?.dataUpdatedAt).toBeGreaterThan(0),
    )
    addNewTicket()
    await check(app)
    await waitFor(() => expect(shown).toHaveLength(1))
    expect(chimes()).toBe(0)
    expect(shown[0].options.silent).toBe(false)

    // Cualquier clic en la página habilita el timbre para el siguiente aviso.
    await app.user.click(await screen.findByRole('heading', { level: 1 }))
    const ticket = getTickets().find((t) => t.id === 'tk-aviso-nuevo')
    addMessage(ticket, { authorType: 'cliente', user: { id: 'u1', name: 'Cliente' }, body: 'Más' })
    await check(app)
    await waitFor(() => expect(shown).toHaveLength(2))
    expect(chimes()).toBe(1)
    expect(shown[1].options.silent).toBe(true)
  })

  it('sin timbre ni notificaciones, el botón pide un clic para activar el sonido', async () => {
    window.localStorage.setItem('panel-alerts', 'on')
    FakeNotification.permission = 'denied'
    renderApp({ route: '/usuarios', session: staff })
    expect(await screen.findByRole('button', { name: 'Avisos' })).toHaveAttribute(
      'title',
      'Haz clic en la página para activar el sonido',
    )
  })

  it('con las notificaciones bloqueadas, avisa solo dentro del panel', async () => {
    nextPermission = 'denied'
    const app = await enableAlerts()
    expect(await screen.findByText('Avisos activados solo dentro del panel.')).toBeInTheDocument()
    addNewTicket()
    await check(app)
    expect(await screen.findByText('Nuevo ticket · Acme Industrial')).toBeInTheDocument()
    expect(shown).toHaveLength(0)
    // El timbre suena igual (hubo clic en "Avisos").
    expect(chimes()).toBe(1)
  })

  it('apagado no revisa la bandeja; el cliente no ve el botón', async () => {
    const requests = recordRequests('/api/staff/tickets')
    const app = renderApp({ route: '/usuarios', session: staff })
    expect(await screen.findByRole('button', { name: 'Avisos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(app.queryClient.getQueryState(ALERTS_QUERY_KEY)?.dataUpdatedAt ?? 0).toBe(0)
    expect(requests).toHaveLength(0)
    app.unmount()

    renderApp({ route: '/soporte', session: client })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: 'Avisos' })).not.toBeInTheDocument()
  })
})
