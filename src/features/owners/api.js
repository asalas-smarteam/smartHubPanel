import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'

import { sortOwners } from './filters'
import { ownerMappingSchema, ownerMappingsSchema, ownerSyncSchema } from './schemas'

export const OWNERS_QUERY_KEY = ['owner-mappings']

/** Todos los responsables de la empresa (N1); `scope` sale de useScope(). */
export function useOwnerMappings(scope) {
  return useQuery({
    queryKey: [...OWNERS_QUERY_KEY, scope.apiBase],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/owner-mappings`, { signal, schema: ownerMappingsSchema }).then(
        (response) => sortOwners(response.items),
      ),
    enabled: scope.ready,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Acciones del administrador (plan 5c, contrato O2 y O3). Con éxito o error (p. ej. 409 porque
 * otro lo cambió) se vuelve a pedir la lista.
 */
export function useOwnerMappingActions(scope) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY })

  /** Solo el vendedor y el empleado; `expectedUpdatedAt` evita pisar un cambio ajeno. */
  const update = useMutation({
    mutationFn: ({ id, erpOwnerId, erpEmployeeId, expectedUpdatedAt }) =>
      apiFetch(`${scope.apiBase}/owner-mappings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        json: { erpOwnerId, erpEmployeeId, expectedUpdatedAt },
        schema: ownerMappingSchema,
      }),
    onSettled: refresh,
  })

  /** Trae del CRM los responsables que falten y refresca nombre y correo de los que ya están. */
  const sync = useMutation({
    mutationFn: () =>
      apiFetch(`${scope.apiBase}/owner-mappings/sync`, { method: 'POST', schema: ownerSyncSchema }),
    onSettled: refresh,
  })

  return { update, sync }
}
