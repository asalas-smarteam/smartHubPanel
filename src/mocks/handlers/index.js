import { authHandlers } from './auth'
import { staffTenantsHandlers } from './staff-tenants'
import { staffUsersHandlers } from './staff-users'

/** Handlers de MSW de la API del panel, según el contrato del spec y el plan 4a §3. */
export const handlers = [...authHandlers, ...staffUsersHandlers, ...staffTenantsHandlers]
