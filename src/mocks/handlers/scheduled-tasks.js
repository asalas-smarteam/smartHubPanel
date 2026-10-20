import { http, HttpResponse } from 'msw'

import { SEED_SCHEDULED_TASKS } from '../seed-scheduled-tasks'
import { bothScopes, resolveScope } from './scope'
import { maybeDelay } from './utils'

// Tareas programadas (contrato J1 a J4): todas las de la empresa, sin paginar.
export const scheduledTaskHandlers = [
  ...bothScopes(http, '/scheduled-tasks', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'tasks.read', params })
    if (scope.response) return scope.response
    return HttpResponse.json({
      items: SEED_SCHEDULED_TASKS.filter((task) => task.tenantKey === scope.tenantKey).map(
        // eslint-disable-next-line no-unused-vars
        ({ tenantKey, ...task }) => task,
      ),
    })
  }),
]
