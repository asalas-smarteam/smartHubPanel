import { Navigate, Outlet, useLocation } from 'react-router'

import { ErrorState, ForbiddenState, FullPageLoading } from '@/components/page-states'

import { usePermissions } from './permissions'
import { useSession } from './session'

function SessionGate({ children }) {
  const { data, isPending, isError, error, refetch } = useSession()
  if (isPending) return <FullPageLoading />
  if (isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="glass rounded-xl">
          <ErrorState error={error} onRetry={refetch} title="No pudimos conectar con el panel" />
        </div>
      </div>
    )
  }
  return children(data)
}

/** Rutas que requieren sesión completa (sin cambio de contraseña pendiente). */
export function RequireAuth() {
  const location = useLocation()
  return (
    <SessionGate>
      {(session) => {
        if (session.status === 'anonymous') {
          const from = `${location.pathname}${location.search}`
          return <Navigate to="/login" replace state={{ from }} />
        }
        if (session.status === 'password_change_required') {
          return <Navigate to="/cambiar-contrasena" replace />
        }
        return <Outlet />
      }}
    </SessionGate>
  )
}

/** Solo para /cambiar-contrasena: hay sesión y el cambio está pendiente. */
export function RequirePasswordChange() {
  return (
    <SessionGate>
      {(session) => {
        if (session.status === 'anonymous') return <Navigate to="/login" replace />
        if (session.status === 'authenticated') return <Navigate to="/" replace />
        return <Outlet />
      }}
    </SessionGate>
  )
}

/** Para /login: si ya hay sesión, lleva a donde iba (o al inicio). */
export function RedirectIfAuthenticated() {
  const location = useLocation()
  return (
    <SessionGate>
      {(session) => {
        if (session.status === 'authenticated') {
          const from = location.state?.from
          const target =
            typeof from === 'string' && from.startsWith('/') && !from.startsWith('/login')
              ? from
              : '/'
          return <Navigate to={target} replace />
        }
        if (session.status === 'password_change_required') {
          return <Navigate to="/cambiar-contrasena" replace />
        }
        return <Outlet />
      }}
    </SessionGate>
  )
}

/** Oculta la sección si falta el permiso. Es solo UI: la API aplica la regla real. */
export function RequirePermission({ permission, children }) {
  const { can } = usePermissions()
  if (!can(permission)) return <ForbiddenState />
  return children ?? <Outlet />
}
