import { BuildingIcon } from 'lucide-react'

import { ErrorState } from '@/components/page-states'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTenants } from '@/features/tenants/api'

/**
 * Selector de empresa para Smarteam (incluye las suspendidas). La empresa vive en la URL.
 * @param {{ value: string | null, onChange: (tenantKey: string) => void, id?: string }} props
 */
export function TenantPicker({ value, onChange, id = 'tenant-picker' }) {
  const tenants = useTenants()
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>Empresa</Label>
      <Select value={value ?? ''} onValueChange={onChange} disabled={tenants.isPending}>
        <SelectTrigger id={id} className="min-w-56">
          <SelectValue placeholder={tenants.isPending ? 'Cargando…' : 'Elige una empresa'} />
        </SelectTrigger>
        <SelectContent>
          {(tenants.data ?? []).map((tenant) => (
            <SelectItem key={tenant.tenantKey} value={tenant.tenantKey}>
              {tenant.companyName}
              {tenant.status === 'suspended' ? ' (suspendida)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tenants.isError && <span className="sr-only">No se pudieron cargar las empresas</span>}
    </div>
  )
}

/**
 * Para Smarteam sin empresa elegida: tarjeta que pide elegirla antes de pedir datos.
 * @param {{ scope: ReturnType<import('./use-scope').useScope>, what: string }} props
 *   `what`: qué se va a ver, p. ej. "sus eventos".
 */
export function TenantGate({ scope, what }) {
  const tenants = useTenants()
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-xl px-6 py-12 text-center">
      <BuildingIcon className="size-8 text-brand-ink-soft" aria-hidden="true" />
      <p className="text-base font-semibold">Elige una empresa para ver {what}</p>
      {tenants.isError ? (
        <ErrorState error={tenants.error} onRetry={tenants.refetch} className="py-0" />
      ) : (
        <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} id="tenant-gate" />
      )}
    </div>
  )
}
