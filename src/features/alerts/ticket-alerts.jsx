import { BellIcon, BellOffIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import {
  notificationPermission,
  readAlertsEnabled,
  requestNotificationPermission,
  saveAlertsEnabled,
} from './notify'
import { soundReady, unlockSound, unlockSoundOnGesture } from './sound'
import { useTicketAlerts } from './use-ticket-alerts'

const BLOCKED_HINT =
  'Las notificaciones están bloqueadas en este navegador. Habilítalas en la configuración del sitio (candado junto a la dirección) para recibirlas en Windows o Mac.'
const SOUND_HINT = 'Haz clic en la página para activar el sonido'

/**
 * Botón "Avisos" de la barra (solo Smarteam) y la revisión de la bandeja mientras está activado
 * (planes 4v y 4w). Cada persona lo activa en su navegador; queda recordado.
 */
export function TicketAlerts() {
  const [enabled, setEnabled] = useState(readAlertsEnabled)
  const [permission, setPermission] = useState(notificationPermission)
  const [soundOn, setSoundOn] = useState(soundReady)
  useTicketAlerts({ enabled })

  // Después de recargar, el timbre se habilita con el primer clic o tecla en la página.
  useEffect(() => {
    if (!enabled || soundOn) return undefined
    return unlockSoundOnGesture(() => setSoundOn(true))
  }, [enabled, soundOn])

  async function toggle() {
    if (enabled) {
      setEnabled(false)
      saveAlertsEnabled(false)
      toast.info('Avisos desactivados.')
      return
    }
    // Dentro del clic: habilita el timbre y pide el permiso de notificaciones.
    const sound = unlockSound()
    const granted = await requestNotificationPermission()
    setSoundOn(await sound)
    setPermission(granted)
    setEnabled(true)
    saveAlertsEnabled(true)
    if (granted === 'granted') {
      toast.success(
        'Avisos activados: sonará y te llegará una notificación con cada ticket nuevo o respuesta.',
      )
    } else {
      toast.info('Avisos activados solo dentro del panel.', { description: BLOCKED_HINT })
    }
  }

  // Sin timbre ni notificaciones no hay forma de sonar: se avisa en el botón.
  const silent = enabled && !soundOn && permission !== 'granted'
  const title = !enabled
    ? 'Activar avisos de tickets nuevos y respuestas'
    : silent
      ? SOUND_HINT
      : permission !== 'granted'
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
      className={enabled && permission !== 'granted' ? 'text-status-waiting-fg' : undefined}
    >
      {enabled ? <BellIcon aria-hidden="true" /> : <BellOffIcon aria-hidden="true" />}
      <span className="hidden sm:inline">Avisos</span>
    </Button>
  )
}
