import { http, HttpResponse } from 'msw'

import { tenantSyncs, tenantTasks, toApiSync, toApiTask } from '../operations'
import { bothScopes, inRange, readDateRange, resolveScope } from './scope'
import { paginate, readPagination } from './ticket-utils'
import { errorResponse, maybeDelay } from './utils'

const STATUSES = new Set(['completed', 'errored', 'running'])

// Syncs (contrato E5 a E10) y tareas para el filtro (E8).
export const syncHandlers = [
  ...bothScopes(http, '/sync-tasks', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'syncs.read', params })
    if (scope.response) return scope.response
    return HttpResponse.json({ items: tenantTasks(scope.tenantKey).map(toApiTask) })
  }),

  ...bothScopes(http, '/syncs', async ({ request, params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'syncs.read', params })
    if (scope.response) return scope.response

    const query = new URL(request.url).searchParams
    const paging = readPagination(query)
    if (!paging) return errorResponse(400, 'validation_error', 'Paginación inválida.')
    const status = query.get('status')
    if (status && !STATUSES.has(status)) {
      return errorResponse(400, 'validation_error', 'Estado inválido.')
    }
    const range = readDateRange(query)
    if (!range) return errorResponse(400, 'validation_error', 'Fecha inválida.')
    const taskId = query.get('taskId')

    const items = tenantSyncs(scope.tenantKey)
      .map(toApiSync)
      .filter(
        (sync) =>
          (!status || sync.status === status) &&
          (!taskId || sync.task.id === taskId) &&
          inRange(sync.startedAt, range),
      )
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return HttpResponse.json(paginate(items, paging))
  }),

  ...bothScopes(http, '/syncs/:id', async ({ request, params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'syncs.read', params })
    if (scope.response) return scope.response
    const raw = tenantSyncs(scope.tenantKey).find((sync) => sync._id === params.id)
    if (!raw) return errorResponse(404, 'not_found')

    const query = new URL(request.url).searchParams
    const paging = readPagination(
      new URLSearchParams({
        ...(query.get('errorsPage') !== null && { page: query.get('errorsPage') }),
        ...(query.get('errorsPageSize') !== null && { pageSize: query.get('errorsPageSize') }),
      }),
    )
    if (!paging) return errorResponse(400, 'validation_error', 'Paginación de errores inválida.')
    return HttpResponse.json({
      ...toApiSync(raw),
      errors: paginate(structuredClone(raw.errors), paging),
    })
  }),
]
