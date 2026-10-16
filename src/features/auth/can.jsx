import { usePermissions } from './permissions'

/** Muestra `children` solo si el usuario tiene `permission` (o cualquiera de una lista); si no, `fallback`. */
export function Can({ permission, children, fallback = null }) {
  const { can } = usePermissions()
  return can(permission) ? children : fallback
}
