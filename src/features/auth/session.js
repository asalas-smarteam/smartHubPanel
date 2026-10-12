import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, ERROR_CODES, hasErrorCode } from '@/lib/api/errors'

import { authApi } from './api'

export const SESSION_QUERY_KEY = ['auth', 'me']
export const ANONYMOUS = Object.freeze({ status: 'anonymous' })

/**
 * Traduce GET /auth/me a un estado de sesión. Nunca deja la query en error por 401
 * o por cambio de contraseña pendiente: los guards solo leen este estado.
 * @returns {Promise<{ status: 'anonymous' } | { status: 'password_change_required', user?: object } | { status: 'authenticated', user: object }>}
 */
export async function fetchSession({ signal } = {}) {
  try {
    const user = await authApi.me(signal)
    if (user.mustChangePassword) return { status: 'password_change_required', user }
    return { status: 'authenticated', user }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return ANONYMOUS
    // Supuesto C1: si el backend responde 403 en /me con cambio pendiente, se trata igual.
    if (hasErrorCode(error, ERROR_CODES.PASSWORD_CHANGE_REQUIRED)) {
      return { status: 'password_change_required' }
    }
    throw error
  }
}

export function sessionQueryOptions() {
  return {
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  }
}

/** Estado de la sesión actual (query de TanStack). */
export function useSession() {
  return useQuery(sessionQueryOptions())
}

/** Vuelve a pedir /me ignorando la caché y devuelve el estado nuevo. */
export function refreshSession(queryClient) {
  return queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 })
}

/** Deja la app sin sesión: borra toda la caché (datos de otro usuario incluidos). */
export function clearSession(queryClient) {
  const isSessionQuery = (query) => query.queryKey[0] === SESSION_QUERY_KEY[0]
  queryClient.cancelQueries()
  // La query de sesión no se elimina: sus observadores (guards) deben ver el cambio.
  queryClient.removeQueries({ predicate: (query) => !isSessionQuery(query) })
  queryClient.setQueryData(SESSION_QUERY_KEY, ANONYMOUS)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.logout,
    // Aunque el servidor falle, en el navegador la sesión se da por cerrada.
    onSettled: () => clearSession(queryClient),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword })
}
