import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ANONYMOUS, SESSION_QUERY_KEY } from '@/features/auth/session'
import { ApiError, ERROR_CODES, getErrorMessage } from '@/lib/api/errors'

const MAX_RETRIES = 2

/** Reintenta solo errores de red o 5xx, nunca 4xx. */
function shouldRetry(failureCount, error) {
  if (failureCount >= MAX_RETRIES) return false
  if (!(error instanceof ApiError)) return false
  return error.code === ERROR_CODES.NETWORK_ERROR || error.status >= 500
}

/**
 * QueryClient de la app con las reacciones globales a errores de la API (plan §5.4).
 * Los errores de validación y de negocio los muestra cada pantalla; aquí solo se manejan
 * la sesión vencida, el cambio de contraseña pendiente y la falta de permiso.
 * @param {{ retry?: boolean }} [options] `retry: false` en los tests.
 */
export function createQueryClient({ retry = true } = {}) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => handleGlobalError(error) }),
    mutationCache: new MutationCache({ onError: (error) => handleGlobalError(error) }),
    defaultOptions: {
      queries: {
        retry: retry ? shouldRetry : false,
        staleTime: 30 * 1000,
      },
      mutations: { retry: false },
    },
  })

  function handleGlobalError(error) {
    if (!(error instanceof ApiError)) return

    if (error.status === 401) {
      const previous = queryClient.getQueryData(SESSION_QUERY_KEY)
      if (previous && previous.status !== 'anonymous') {
        toast.error('Tu sesión expiró. Vuelve a entrar.', { id: 'session-expired' })
      }
      // El guard de rutas redirige solo a /login.
      queryClient.setQueryData(SESSION_QUERY_KEY, ANONYMOUS)
      return
    }

    if (error.code === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) {
      // El guard de rutas lleva a /cambiar-contrasena cuando /me lo confirme.
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
      return
    }

    if (error.status === 403) {
      toast.error(getErrorMessage(error), { id: 'forbidden' })
    }
  }

  return queryClient
}
