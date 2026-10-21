import { BellIcon, BellOffIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import {
  notificationPermission,
  readAlertsEnabled,
  requestNotificationPermission,
  saveAlertsEnabled,
} from './notify'
import { useTicketAlerts } from './use-ticket-alerts'

const BLOCKED_HINT =
  'Las notificaciones están bloqueadas en este navegador. Habilítalas en la configuración del sitio (candado junto a la dirección) para recibirlas en Windows o Mac.'

/**
 * Botón "Avisos" de la barra (solo Smarteam) y la revisión de la bandeja mientras está activado
 * (plan 4v). Cada persona lo activa en su navegador; queda recordado.
 */
export function TicketAlerts() {
  const [enabled, setEnabled] = useState(readAlertsEnabled)
  const [permission, setPermission] = useState(notificationPermission)
  useTicketAlerts({ enabled })

  async function toggle() {
    if (enabled) {
      setEnabled(false)
      saveAlertsEnabled(false)
      toast.info('Avisos desactivados.')
      return
    }
    const granted = await requestNotificationPermission()
    setPermission(granted)
    setEnabled(true)
    saveAlertsEnabled(true)
    if (granted === 'granted') {
      toast.success(
        'Avisos activados: te llegará una notificación con cada ticket nuevo o respuesta.',
      )
    } else {
      toast.info('Avisos activados solo dentro del panel.', { description: BLOCKED_HINT })
    }
  }

  const blocked = enabled && permission !== 'granted'
  const title = !enabled
    ? 'Activar avisos de tickets nuevos y respuestas'
    : blocked
      ? BLOCKED_HINT
      : 'Avisos activados. Clic para desactivarlos'

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label="Avisos"
      title={title}
      className={blocked ? 'text-status-waiting-fg' : undefined}
    >
      {enabled ? <BellIcon aria-hidden="true" /> : <BellOffIcon aria-hidden="true" />}
      <span className="hidden sm:inline">Avisos</span>
    </Button>
  )
}
