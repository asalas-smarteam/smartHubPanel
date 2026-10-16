import { useCallback, useSyncExternalStore } from 'react'

/** Temas del panel. `dark` es el de por defecto (dirección A del plan 4e). */
export const THEMES = Object.freeze(['dark', 'light'])
export const DEFAULT_THEME = 'dark'
export const THEME_STORAGE_KEY = 'panel-theme'
const CHANGE_EVENT = 'panel-theme-change'

const normalize = (value) => (value === 'light' ? 'light' : DEFAULT_THEME)

/** Tema guardado en este navegador (o el de por defecto si no hay o no se puede leer). */
export function readStoredTheme() {
  try {
    return normalize(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

/** Tema aplicado ahora (atributo `data-theme` de <html>; index.html lo pone antes de pintar). */
export function getTheme() {
  return normalize(document.documentElement.dataset.theme)
}

/** Aplica y recuerda el tema. Si el navegador no deja guardar, queda aplicado igual. */
export function setTheme(theme) {
  const next = normalize(theme)
  document.documentElement.dataset.theme = next
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento disponible: el tema dura hasta recargar.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

/** Tema actual y funciones para cambiarlo. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME)
  const toggle = useCallback(() => setTheme(getTheme() === 'dark' ? 'light' : 'dark'), [])
  return { theme, setTheme, toggle }
}
