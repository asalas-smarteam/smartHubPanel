import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch } from '@/lib/api/client'

export const tenantSchema = z.object({
  tenantKey: z.string(),
  companyName: z.string(),
  status: z.string(),
})

const tenantsResponseSchema = z.object({ items: z.array(tenantSchema) })

/**
 * Empresas para los selectores (supuesto C7: GET /api/staff/tenants, sin paginar).
 * Solo Smarteam puede pedirlas: las pantallas compartidas pasan `enabled: false` al cliente.
 */
export function useTenants({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['staff', 'tenants'],
    queryFn: ({ signal }) =>
      apiFetch('/staff/tenants', { signal, schema: tenantsResponseSchema }).then((r) => r.items),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
