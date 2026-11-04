import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'

import { apiTokenListSchema, createdApiTokenSchema } from './schemas'

// API de los tokens personales de la cuenta (plan 4z, permiso staff.tickets).

export const API_TOKENS_QUERY_KEY = ['account', 'api-tokens']

export const apiTokensApi = {
  list: (signal) => apiFetch('/account/api-tokens', { signal, schema: apiTokenListSchema }),
  create: ({ name, currentPassword }) =>
    apiFetch('/account/api-tokens', {
      method: 'POST',
      json: { name, currentPassword },
      schema: createdApiTokenSchema,
    }),
  revoke: (id) => apiFetch(`/account/api-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export function useApiTokens() {
  return useQuery({
    queryKey: API_TOKENS_QUERY_KEY,
    queryFn: ({ signal }) => apiTokensApi.list(signal),
  })
}

function useApiTokensMutation(mutationFn, options) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Con éxito o error (p. ej. 409 por el límite) se vuelve a pedir la lista.
    onSettled: () => queryClient.invalidateQueries({ queryKey: API_TOKENS_QUERY_KEY }),
    ...options,
  })
}

/**
 * Crear un token. La respuesta trae el token completo y las variables la contraseña: con
 * `gcTime: 0` la mutación sale de la MutationCache apenas nadie la observa (al hacer `reset()` o
 * desmontar), en vez de quedar 5 minutos en memoria.
 */
export const useCreateApiToken = () => useApiTokensMutation(apiTokensApi.create, { gcTime: 0 })
export const useRevokeApiToken = () => useApiTokensMutation(apiTokensApi.revoke)
