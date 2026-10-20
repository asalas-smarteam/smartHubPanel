import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '@/lib/api/client'

import { sortTasks } from './filters'
import { scheduledTasksSchema } from './schemas'

export const TASKS_QUERY_KEY = ['scheduled-tasks']

/** Todas las tareas programadas de la empresa (J1); `scope` sale de useScope(). */
export function useScheduledTasks(scope) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEY, scope.apiBase],
    queryFn: ({ signal }) =>
      apiFetch(`${scope.apiBase}/scheduled-tasks`, { signal, schema: scheduledTasksSchema }).then(
        (response) => sortTasks(response.items),
      ),
    enabled: scope.ready,
    staleTime: 60 * 1000,
  })
}
