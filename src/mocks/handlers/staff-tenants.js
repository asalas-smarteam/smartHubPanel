import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import { authorize, maybeDelay } from './utils'

export const staffTenantsHandlers = [
  // Supuesto C7: endpoint nuevo para los selectores de empresa.
  http.get('/api/staff/tenants', async () => {
    await maybeDelay()
    const { response } = authorize({ permission: 'staff.users' })
    if (response) return response
    return HttpResponse.json({ items: getDb().tenants.map((tenant) => ({ ...tenant })) })
  }),
]
