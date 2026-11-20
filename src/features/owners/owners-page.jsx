import { ArrowRightIcon } from 'lucide-react'

import { StatTile } from '@/components/charts/stat-tile'
import { DataTable } from '@/components/data-table/data-table'
import { FilterSelect } from '@/components/filter-select'
import { TextFilter } from '@/components/text-filter'
import { Badge } from '@/components/ui/badge'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { useScope } from '@/features/scope/use-scope'
import { formatNumber } from '@/lib/format'
import { pickOption, usePaginationParams } from '@/lib/pagination'

import { useOwnerMappings } from './api'
import { EMPTY_VALUE, sourceLabel, STATUS_FILTERS, STATUS_OPTIONS } from './constants'
import { filterOwners, hasCode, summarizeOwners } from './filters'

const empty = <span className="text-muted-foreground">{EMPTY_VALUE}</span>
const mono = (value) =>
  hasCode(value) ? <span className="font-mono text-xs">{value}</span> : empty

/** Nombre y, debajo, el correo (o solo lo que haya). */
function CrmOwner({ owner }) {
  if (!owner.crmOwnerName && !owner.crmOwnerEmail) return empty
  return (
    <span className="flex flex-col">
      <span className="font-medium">{owner.crmOwnerName ?? owner.crmOwnerEmail}</span>
      {owner.crmOwnerName && owner.crmOwnerEmail && (
        <span className="text-xs text-muted-foreground">{owner.crmOwnerEmail}</span>
      )}
    </span>
  )
}

/** Código del vendedor en el ERP y, si lo hay, su nombre. Sin vendedor: aviso en ámbar. */
function ErpSeller({ owner }) {
  if (!hasCode(owner.erpOwnerId)) {
    return <span className="text-status-waiting-fg">Sin vendedor</span>
  }
  return (
    <span className="flex flex-col">
      <span className="font-mono text-xs">{owner.erpOwnerId}</span>
      {owner.erpOwnerName && (
        <span className="text-xs text-muted-foreground">{owner.erpOwnerName}</span>
      )}
    </span>
  )
}

const columns = [
  {
    id: 'crmOwner',
    header: 'Responsable en el CRM',
    meta: { cellClassName: 'whitespace-normal min-w-48' },
    cell: ({ row }) => <CrmOwner owner={row.original} />,
  },
  { id: 'crmOwnerId', header: 'ID en el CRM', cell: ({ row }) => mono(row.original.crmOwnerId) },
  {
    id: 'direction',
    header: <span className="sr-only">Corresponde a</span>,
    meta: { cellClassName: 'text-center' },
    cell: () => (
      <span className="inline-flex text-direction" title="Corresponde a">
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </span>
    ),
  },
  {
    id: 'erpOwner',
    header: 'Vendedor en el ERP',
    cell: ({ row }) => <ErpSeller owner={row.original} />,
  },
  {
    id: 'erpEmployeeId',
    header: 'Empleado en el ERP (digitador)',
    cell: ({ row }) => mono(row.original.erpEmployeeId),
  },
  {
    id: 'active',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.active ? (
        <Badge variant="success">Activo</Badge>
      ) : (
        <Badge variant="muted">Inactivo</Badge>
      ),
  },
  { id: 'source', header: 'Origen', cell: ({ row }) => sourceLabel(row.original.source) },
]

const getRowId = (row) => row.id

/** Mapeo de responsables de la empresa, solo lectura (plan 5b, contrato 13). */
export function OwnersPage() {
  const scope = useScope()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const filters = {
    estado: pickOption(getFilter('estado'), STATUS_FILTERS),
    q: getFilter('q'),
  }
  const owners = useOwnerMappings(scope)
  const all = owners.data
  const filtered = all ? filterOwners(all, filters) : undefined
  const data = filtered && {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
  }
  const totals = all && summarizeOwners(all)
  const hasFilters = Boolean(filters.estado || filters.q)
  const whose = scope.picksTenant ? 'Esta empresa' : 'Tu empresa'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mapeo de responsables</h1>
        <p className="text-sm text-muted-foreground">
          Qué vendedor y empleado del ERP corresponde a cada responsable del CRM. Solo lectura.
        </p>
      </div>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="su mapeo de responsables" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
            {scope.picksTenant && (
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            )}
            <FilterSelect
              id="owners-status-filter"
              label="Estado"
              value={filters.estado}
              options={STATUS_OPTIONS}
              onChange={(value) => setFilter('estado', value)}
            />
            <TextFilter
              id="owners-search"
              label="Buscar"
              placeholder="Nombre, correo o código"
              value={filters.q}
              onApply={(value) => setFilter('q', value)}
            />
          </div>

          {totals && (
            <ul
              aria-label="Resumen de responsables"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {[
                ['Responsables', totals.total, undefined],
                ['Activos', totals.active, undefined],
                ['Sin vendedor en el ERP', totals.withoutSeller, 'activos sin código de vendedor'],
              ].map(([label, value, note]) => (
                <li key={label} className="flex">
                  <StatTile
                    className="flex-1"
                    label={label}
                    value={formatNumber(value)}
                    note={note}
                    tone={label.startsWith('Sin') && value > 0 ? 'warning' : 'default'}
                  />
                </li>
              ))}
            </ul>
          )}

          <DataTable
            label="Mapeo de responsables"
            columns={columns}
            data={data}
            getRowId={getRowId}
            page={page}
            pageSize={pageSize}
            onPaginationChange={setPagination}
            isPending={owners.isPending}
            isFetching={owners.isFetching}
            error={owners.error}
            onRetry={owners.refetch}
            emptyTitle={
              hasFilters
                ? 'Ningún responsable coincide con los filtros'
                : `${whose} todavía no tiene responsables mapeados`
            }
          />
        </>
      )}
    </div>
  )
}
