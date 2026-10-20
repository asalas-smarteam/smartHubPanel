import { useMemo } from 'react'

import { useSession } from './session'

/** Permisos de la Fase 1 (tabla del spec). Usar siempre estas constantes, no strings sueltos. */
export const PERMISSIONS = Object.freeze({
  TICKETS_READ: 'tickets.read',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_REPLY: 'tickets.reply',
  TICKETS_REOPEN: 'tickets.reopen',
  EVENTS_READ: 'events.read',
  SYNCS_READ: 'syncs.read',
  // Mapeo de campos de la empresa, solo lectura (plan 4p, contrato I3).
  MAPPINGS_READ: 'mappings.read',
  // Tareas programadas de la empresa, solo lectura (plan 4r, contrato J4).
  TASKS_READ: 'tasks.read',
  STAFF_TICKETS: 'staff.tickets',
  STAFF_USERS: 'staff.users',
  STAFF_EVENTS_RAW: 'staff.events.raw',
})

const KNOWN_PERMISSIONS = new Set(Object.values(PERMISSIONS))

/**
 * ¿La lista de permisos incluye `permission`? Con una lista de permisos, basta cualquiera.
 * Los permisos que el front no conoce se ignoran.
 * Es solo para mostrar u ocultar UI: la regla real la aplica la API.
 * @param {string[]} permissions
 * @param {string | string[]} permission
 */
export function can(permissions, permission) {
  if (Array.isArray(permission)) return permission.some((one) => can(permissions, one))
  return KNOWN_PERMISSIONS.has(permission) && permissions.includes(permission)
}

/** Permisos del usuario actual, sacados de GET /auth/me. Nunca mira accountType ni role. */
export function usePermissions() {
  const { data } = useSession()
  const permissions = data?.user?.permissions
  return useMemo(() => {
    const list = (permissions ?? []).filter((permission) => KNOWN_PERMISSIONS.has(permission))
    return { permissions: list, can: (permission) => can(list, permission) }
  }, [permissions])
}
