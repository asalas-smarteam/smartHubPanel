import { http, HttpResponse } from 'msw'

import { getDb } from '../db'
import { authorize, maybeDelay } from './utils'

export const staffTenantsHandlers = [
  // Supuesto C7: endpoint nuevo para los selectores de empresa.
  http.get('/api/staff/tenants', async () => {
    await maybeDelay()
    // C7: lo usan Usuarios, la Bandeja y Eventos/Syncs de Smarteam (cualquier permiso staff.*).
    const allowed = ['staff.users', 'staff.tickets', 'staff.events.raw'].map((permission) =>
      authorize({ permission }),
    )
    if (allowed.every((result) => result.response)) return allowed[0].response
    return HttpResponse.json({ items: getDb().tenants.map((tenant) => ({ ...tenant })) })
  }),
]
