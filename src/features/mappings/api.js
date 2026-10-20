import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'

import { sortMappings } from './filters'
import { fieldMappingsSchema } from './schemas'

export const MAPPINGS_QUERY_KEY = ['field-mappings']

/** Todos los mapeos de la empresa (I1); `scope` sale de useScope(). */
export function useFieldMappings(scope) {
  return useQuery({
    queryKey: [...MAPPINGS_QUERY_KEY, scope.apiBase],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/field-mappings`, { signal, schema: fieldMappingsSchema }).then(
        (response) => sortMappings(response.items),
      ),
    enabled: scope.ready,
    staleTime: 5 * 60 * 1000,
  })
}
