import { PERMISSIONS } from '@/features/auth/permissions'

/** Páginas de "Mi cuenta" (plan 4z). Cada una se ve solo con el permiso de su ruta. */
export const ACCOUNT_LINKS = [
  { to: '/cuenta/contrasena', label: 'Contraseña', permission: PERMISSIONS.STAFF_USERS },
  { to: '/cuenta/tokens', label: 'Tokens de API', permission: PERMISSIONS.STAFF_TICKETS },
]

/**
 * Primera página de la cuenta a la que tiene acceso el usuario (destino del botón "Cuenta" de la
 * barra), o null si no tiene ninguna.
 * @param {(permission: string) => boolean} can
 */
export function accountHome(can) {
  return ACCOUNT_LINKS.find((link) => can(link.permission))?.to ?? null
}
