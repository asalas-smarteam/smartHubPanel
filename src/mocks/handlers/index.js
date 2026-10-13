import { authHandlers } from './auth'
import { eventHandlers } from './events'
import { staffTicketHandlers } from './staff-tickets'
import { staffTenantsHandlers } from './staff-tenants'
import { staffUsersHandlers } from './staff-users'
import { syncHandlers } from './syncs'
import { ticketHandlers } from './tickets'

/** Handlers de MSW de la API del panel, según el contrato del spec y el plan 4a §3. */
export const handlers = [
  ...authHandlers,
  ...staffUsersHandlers,
  ...staffTenantsHandlers,
  ...ticketHandlers,
  ...staffTicketHandlers,
  ...eventHandlers,
  ...syncHandlers,
]
