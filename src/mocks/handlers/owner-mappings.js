import { http, HttpResponse } from 'msw'

import { SEED_OWNER_MAPPINGS } from '../seed-owner-mappings'
import { bothScopes, resolveScope } from './scope'
import { maybeDelay } from './utils'

// Mapeo de responsables (contrato N1 a N3): todos los de la empresa, sin paginar.
export const ownerMappingHandlers = [
  ...bothScopes(http, '/owner-mappings', async ({ params }) => {
    await maybeDelay()
    const scope = resolveScope({ permission: 'mappings.read', params })
    if (scope.response) return scope.response
    return HttpResponse.json({
      items: SEED_OWNER_MAPPINGS.filter((item) => item.tenantKey === scope.tenantKey).map(
        // eslint-disable-next-line no-unused-vars
        ({ tenantKey, ...item }) => item,
      ),
    })
  }),
]
