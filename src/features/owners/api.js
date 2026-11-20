import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'

import { sortOwners } from './filters'
import { ownerMappingsSchema } from './schemas'

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
