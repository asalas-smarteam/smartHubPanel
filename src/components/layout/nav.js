import { ActivityIcon, InboxIcon, LifeBuoyIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'

import { PERMISSIONS } from '@/features/auth/permissions'

/**
 * Ítems del menú lateral, en orden. Cada uno se muestra solo si el usuario tiene su permiso;
 * el inicio lleva al primero permitido.
 */
export const NAV_ITEMS = [
  { to: '/soporte', label: 'Soporte', icon: LifeBuoyIcon, permission: PERMISSIONS.TICKETS_READ },
  { to: '/bandeja', label: 'Bandeja', icon: InboxIcon, permission: PERMISSIONS.STAFF_TICKETS },
  { to: '/eventos', label: 'Eventos', icon: ActivityIcon, permission: PERMISSIONS.EVENTS_READ },
  { to: '/syncs', label: 'Syncs', icon: RefreshCwIcon, permission: PERMISSIONS.SYNCS_READ },
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon, permission: PERMISSIONS.STAFF_USERS },
]

/** Ítems visibles según una función `can(permission)`. */
export function visibleNavItems(can) {
  return NAV_ITEMS.filter((item) => can(item.permission))
}
