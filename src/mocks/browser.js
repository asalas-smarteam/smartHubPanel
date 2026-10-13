import { setupWorker } from 'msw/browser'

import { enableBrowserPersistence } from './db'
import { handlers } from './handlers'
import { setMockDelay } from './handlers/utils'

/**
 * Le recuerda al service worker que esta pestaña usa la API simulada.
 *
 * El navegador puede detener el worker de MSW cuando queda inactivo (p. ej. con la pestaña en
 * segundo plano). Al volver a arrancar, el worker olvida qué pestañas tenían el mock activo y
 * deja pasar las requests al proxy de Vite: sin backend, la API responde "El servidor tuvo un
 * problema". Se espera la confirmación del worker (`MOCKING_ENABLED`) o, como máximo, 1 s.
 */
function reactivateWorker() {
  const controller = navigator.serviceWorker?.controller
  if (!controller) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(done, 1000)
    function done() {
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('message', onMessage)
      resolve()
    }
    function onMessage(event) {
      if (event.data?.type === 'MOCKING_ENABLED') done()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    controller.postMessage('MOCK_ACTIVATE')
  })
}

/** Antes de cada llamada a /api, y al volver a la pestaña, se reactiva el mock. */
function keepMockActive() {
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      await reactivateWorker()
    }
    return originalFetch(input, init)
  }
  // Las imágenes de los tickets no pasan por fetch(): se cubren al volver a la pestaña.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reactivateWorker()
  })
}

/** Arranca la API simulada en el navegador (`npm run dev:mock`). */
export async function startMockApi() {
  enableBrowserPersistence()
  setMockDelay(250)
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  keepMockActive()
  console.info(
    '[mock] API simulada activa. Cuentas de prueba en el README. Para reiniciar los datos, borra "panel-mock-db" del localStorage.',
  )
}
