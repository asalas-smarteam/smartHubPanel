import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/app'
import './index.css'

async function bootstrap() {
  // `npm run dev:mock`: API simulada con MSW. En producción esta rama no existe.
  if (import.meta.env.MODE === 'mock') {
    const { startMockApi } = await import('./mocks/browser')
    await startMockApi()
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
