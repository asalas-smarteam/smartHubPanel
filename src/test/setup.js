import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { resetDb } from '@/mocks/db'
import { server } from '@/mocks/server'
import { resetTicketsTestState } from '@/mocks/tickets-db'

import { installMultipartShim } from './multipart'

configure({
  // Las páginas se cargan con lazy(): la primera carga de un módulo puede tardar varios
  // segundos en máquinas lentas (Windows, carpeta en OneDrive, muchos workers en paralelo).
  asyncUtilTimeout: 10000,
  // React copia el valor de un <textarea> controlado a su texto: sin esto, findByText
  // encuentra el borrador del formulario en vez del mensaje ya guardado.
  defaultIgnore: 'script, style, textarea',
})

// jsdom no implementa algunas APIs que usan los componentes de Radix (Select, Dialog).
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (!URL.createObjectURL) {
  let blobSequence = 0
  URL.createObjectURL = () => {
    blobSequence += 1
    return `blob:prueba/${blobSequence}`
  }
  URL.revokeObjectURL = () => {}
}
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })
}

let uninstallMultipartShim
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  uninstallMultipartShim = installMultipartShim()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDb()
  resetTicketsTestState()
})

afterAll(() => {
  uninstallMultipartShim()
  server.close()
})
