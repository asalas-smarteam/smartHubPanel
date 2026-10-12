import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/query-client'
import { routes } from '@/app/routes'
import { signInAs } from '@/mocks/db'
import { DEMO_ACCOUNTS } from '@/mocks/seed'

export { DEMO_ACCOUNTS }

/**
 * Monta la app completa (rutas reales + API simulada por MSW) en `route`.
 * @param {{ route?: string, session?: string | null }} [options]
 *   `session`: correo de un usuario del seed con el que se inicia sesión antes de montar.
 */
export function renderApp({ route = '/', session = null } = {}) {
  if (session) signInAs(session)
  const queryClient = createQueryClient({ retry: false })
  const router = createMemoryRouter(routes, { initialEntries: [route] })
  const user = userEvent.setup()
  const utils = render(
    <AppProviders queryClient={queryClient} devtools={false}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, user, router, queryClient }
}
