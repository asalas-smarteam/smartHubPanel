import { UsersIcon } from 'lucide-react'

import { PERMISSIONS } from '@/features/auth/permissions'

/**
 * Ítems del menú lateral. Cada uno se muestra solo si el usuario tiene su permiso.
 * Los planes siguientes agregan aquí Soporte, Bandeja, Eventos y Syncs.
 */
export const NAV_ITEMS = [
  { to: '/usuarios', label: 'Usuarios', icon: UsersIcon, permission: PERMISSIONS.STAFF_USERS },
]

/** Ítems visibles según una función `can(permission)`. */
export function visibleNavItems(can) {
  return NAV_ITEMS.filter((item) => can(item.permission))
}
