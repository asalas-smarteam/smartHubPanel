import { setupWorker } from 'msw/browser'

import { enableBrowserPersistence } from './db'
import { handlers } from './handlers'
import { setMockDelay } from './handlers/utils'

/** Arranca la API simulada en el navegador (`npm run dev:mock`). */
export async function startMockApi() {
  enableBrowserPersistence()
  setMockDelay(250)
  const worker = setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  console.info(
    '[mock] API simulada activa. Cuentas de prueba en el README. Para reiniciar los datos, borra "panel-mock-db" del localStorage.',
  )
}
