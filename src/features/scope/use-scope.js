import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

import { useSession } from '@/features/auth/session'

/** Parámetro de la URL con la empresa elegida por Smarteam (`?empresa=ACME`). */
export const TENANT_PARAM = 'empresa'

// Al cambiar de empresa, estos parámetros dejan de tener sentido (ids y páginas de la anterior).
const RESET_ON_TENANT_CHANGE = ['page', 'taskId', 'errorsPage']

/**
 * Prefijo de la API para Eventos y Syncs según la sesión (plan 4c §2), sin mirar `accountType`:
 * - Con `tenantKey` en /auth/me (cliente): siempre su empresa, rutas `/events`, `/syncs`…
 * - Sin `tenantKey` (Smarteam): la empresa se elige y queda en la URL;
 *   rutas `/staff/tenants/:tenantKey/events`…
 */
export function useScope() {
  const { data } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const ownTenant = data?.user?.tenantKey ?? null
  const chosen = searchParams.get(TENANT_PARAM) || null

  const setTenant = useCallback(
    (tenantKey) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        for (const name of RESET_ON_TENANT_CHANGE) params.delete(name)
        if (tenantKey) params.set(TENANT_PARAM, tenantKey)
        else params.delete(TENANT_PARAM)
        return params
      })
    },
    [setSearchParams],
  )

  if (ownTenant) {
    return { picksTenant: false, tenantKey: ownTenant, apiBase: '', ready: true, setTenant }
  }
  return {
    picksTenant: true,
    tenantKey: chosen,
    apiBase: chosen ? `/staff/tenants/${encodeURIComponent(chosen)}` : null,
    ready: Boolean(chosen),
    setTenant,
  }
}

/** Sufijo `?empresa=…` para enlazar al detalle manteniendo la empresa elegida. */
export function scopeSearch(scope) {
  return scope.picksTenant && scope.tenantKey
    ? `?${new URLSearchParams({ [TENANT_PARAM]: scope.tenantKey })}`
    : ''
}
