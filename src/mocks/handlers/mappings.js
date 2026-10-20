import { http, HttpResponse } from 'msw'

import { SEED_MAPPINGS } from '../seed-mappings'
import { bothScopes, resolveScope } from './scope'
import { maybeDelay } from './utils'

// Mapeo de campos (contrato I1 a I3): todos los de la empresa, sin paginar.
export const mappingHandlers = [
  ...bothScopes(http, '/field-mappings', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'mappings.read', params })
    if (scope.response) return scope.response
    return HttpResponse.json({
      items: SEED_MAPPINGS.filter((item) => item.tenantKey === scope.tenantKey).map(
        // eslint-disable-next-line no-unused-vars
        ({ tenantKey, ...item }) => item,
      ),
    })
  }),
]
