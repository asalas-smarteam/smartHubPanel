import { useSession } from '@/features/auth/session'
import { useTenants } from '@/features/tenants/api'

/**
 * Nombre de la empresa del alcance: la del cliente (de la sesión) o la elegida por Smarteam.
 * @param {ReturnType<import('./use-scope').useScope>} scope
 */
export function useCompanyName(scope) {
  const { data: session } = useSession()
  const tenants = useTenants({ enabled: scope.picksTenant })
  if (!scope.picksTenant) return session?.user?.companyName ?? null
  return tenants.data?.find((tenant) => tenant.tenantKey === scope.tenantKey)?.companyName ?? null
}
