import { http, HttpResponse } from 'msw'

import { EVENT_STATUS_MAP, tenantEvents, toApiEvent } from '../operations'
import { permissionsFor } from '../permissions'
import { bothScopes, inRange, readDateRange, resolveScope } from './scope'
import { paginate, readPagination } from './ticket-utils'
import { errorResponse, maybeDelay } from './utils'

const API_STATUSES = new Set(Object.values(EVENT_STATUS_MAP))

// Eventos (contrato E1 a E4, E9, E10). Lista y detalle, del cliente y de Smarteam por empresa.
export const eventHandlers = [
  ...bothScopes(http, '/events', async ({ request, params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'events.read', params })
    if (scope.response) return scope.response

    const query = new URL(request.url).searchParams
    const paging = readPagination(query)
    if (!paging) return errorResponse(400, 'validation_error', 'Paginación inválida.')
    const status = query.get('status')
    if (status && !API_STATUSES.has(status)) {
      return errorResponse(400, 'validation_error', 'Estado inválido.')
    }
    const range = readDateRange(query)
    if (!range) return errorResponse(400, 'validation_error', 'Fecha inválida.')
    const type = query.get('type')
    const reference = query.get('reference')

    const items = tenantEvents(scope.tenantKey)
      .map((raw) => toApiEvent(raw))
      .filter(
        (event) =>
          (!status || event.status === status) &&
          (!type || event.type === type) &&
          (!reference || event.reference === reference) &&
          inRange(event.createdAt, range),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(paginate(items, paging))
  }),

  ...bothScopes(http, '/events/:id', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'events.read', params })
    if (scope.response) return scope.response
    const raw = tenantEvents(scope.tenantKey).find((event) => event._id === params.id)
    if (!raw) return errorResponse(404, 'not_found')
    // payload y audit: solo en la ruta de Smarteam y con staff.events.raw.
    const withRaw =
      params.tenantKey !== undefined && permissionsFor(scope.user).includes('staff.events.raw')
    return HttpResponse.json(toApiEvent(raw, { withRaw }))
  }),
]
