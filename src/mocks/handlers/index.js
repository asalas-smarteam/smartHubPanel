import { authHandlers } from './auth'
import { dashboardHandlers } from './dashboard'
import { eventHandlers } from './events'
import { metricsHandlers } from './metrics'
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
  // Antes que los de tickets: `/tickets/metrics` no es un `/tickets/:id`.
  ...metricsHandlers,
  ...ticketHandlers,
  ...staffTicketHandlers,
  ...eventHandlers,
  ...dashboardHandlers,
  ...syncHandlers,
]
