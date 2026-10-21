// Notificación del sistema (Windows / macOS) desde el navegador y preferencias de avisos.
// localStorage es solo una comodidad de este navegador: si falla, los avisos siguen andando.

const ENABLED_KEY = 'panel-alerts'
const SEEN_KEY = 'panel-alerts-seen'
const SEEN_LIMIT = 100

export function readAlertsEnabled() {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === 'on'
  } catch {
    return false
  }
}

export function saveAlertsEnabled(enabled) {
  try {
    if (enabled) window.localStorage.setItem(ENABLED_KEY, 'on')
    else window.localStorage.removeItem(ENABLED_KEY)
  } catch {
    // Sin almacenamiento: vale solo para esta pestaña.
  }
}

/**
 * Se queda con las claves que ninguna pestaña avisó todavía y las marca como avisadas.
 * @param {string[]} keys
 * @returns {string[]}
 */
export function claimAlerts(keys) {
  try {
    const seen = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')
    const fresh = keys.filter((key) => !seen.includes(key))
    if (fresh.length > 0) {
      const next = [...seen, ...fresh].slice(-SEEN_LIMIT)
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(next))
    }
    return fresh
  } catch {
    return keys
  }
}

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function notificationPermission() {
  return notificationsSupported() ? window.Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (window.Notification.permission !== 'default') return window.Notification.permission
  try {
    return await window.Notification.requestPermission()
  } catch {
    return window.Notification.permission
  }
}

/**
 * Notificación del sistema; al hacer clic enfoca el panel y llama a `onClick`.
 * `silent`: sin el sonido del sistema (cuando ya sonó el timbre del panel).
 * Sin permiso no hace nada (queda el aviso dentro del panel).
 */
export function showSystemNotification({ title, body, tag, silent = false, onClick }) {
  if (notificationPermission() !== 'granted') return null
  try {
    const notification = new window.Notification(title, {
      body,
      tag,
      silent,
      icon: '/favicon.svg',
    })
    notification.onclick = () => {
      window.focus()
      onClick?.()
      notification.close()
    }
    return notification
  } catch {
    return null
  }
}
