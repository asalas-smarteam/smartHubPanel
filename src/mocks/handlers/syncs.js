import { http, HttpResponse } from 'msw'

import {
  EVENT_QUEUE_TASK,
  tenantSyncs,
  tenantTasks,
  toApiSync,
  toApiTask,
  toClientSync,
  toClientSyncError,
} from '../operations'
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
    // La cola de eventos va al final (plan 5 del backend, G1).
    return HttpResponse.json({
      items: [...tenantTasks(scope.tenantKey).map(toApiTask), { ...EVENT_QUEUE_TASK }],
    })
  }),

  ...bothScopes(http, '/syncs', async ({ request, params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'syncs.read', params })
    if (scope.response) return scope.response

    const query = new URL(request.url).searchParams
    const paging = readPagination(query)
    if (!paging) return errorResponse(400, 'validation_error', 'Paginación inválida.')
    if (paging.page * paging.pageSize > 10_000) {
      return errorResponse(
        400,
        'validation_error',
        'La página pedida es demasiado alta. Usa los filtros para acotar la lista.',
      )
    }
    const status = query.get('status')
    if (status && !STATUSES.has(status)) {
      return errorResponse(400, 'validation_error', 'Estado inválido.')
    }
    const range = readDateRange(query)
    if (!range) return errorResponse(400, 'validation_error', 'Fecha inválida.')
    const taskId = query.get('taskId')
    if (taskId && taskId !== EVENT_QUEUE_TASK.id && !/^[0-9a-f]{24}$/i.test(taskId)) {
      return errorResponse(400, 'validation_error', 'Tarea inválida.')
    }

    // G2: hideEmpty=true deja solo corridas con algo procesado.
    const hideEmpty = query.get('hideEmpty')
    if (hideEmpty !== null && !['true', 'false'].includes(hideEmpty)) {
      return errorResponse(400, 'validation_error', 'Valor inválido para ocultar corridas vacías.')
    }
    // Ruta de cliente: vista de cliente (G4); la de Smarteam, cruda.
    const view = params.tenantKey === undefined ? toClientSync : toApiSync

    const items = tenantSyncs(scope.tenantKey)
      .map(view)
      .filter(
        (sync) =>
          (hideEmpty !== 'true' || sync.counts.processed > 0) &&
          (!status || sync.status === status) &&
          (!taskId || sync.task?.id === taskId) &&
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
    const client = params.tenantKey === undefined
    return HttpResponse.json({
      ...(client ? toClientSync(raw) : toApiSync(raw)),
      errors: paginate(
        client ? raw.errors.map(toClientSyncError) : structuredClone(raw.errors),
        paging,
      ),
    })
  }),
]
