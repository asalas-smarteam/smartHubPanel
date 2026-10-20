import { ArrowLeftRightIcon, ArrowRightIcon, LockIcon } from 'lucide-react'
import { StatTile } from '@/components/charts/stat-tile'
import { DataTable } from '@/components/data-table/data-table'
import { FilterSelect } from '@/components/filter-select'
import { TextFilter } from '@/components/text-filter'
import { Badge } from '@/components/ui/badge'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { useScope } from '@/features/scope/use-scope'
import { formatNumber } from '@/lib/format'
import { pickOption, usePaginationParams } from '@/lib/pagination'

import { useFieldMappings } from './api'
import { contextLabel, EMPTY_VALUE, objectLabel, STATUS_FILTERS, STATUS_OPTIONS } from './constants'
import { filterMappings, optionsFrom, summarize } from './filters'

const fieldCell = (value) =>
  value ? (
    <span className="font-mono text-xs">{value}</span>
  ) : (
    <span className="text-muted-foreground">{EMPTY_VALUE}</span>
  )

const yesNo = (value) => (value ? 'Sí' : <span className="text-muted-foreground">No</span>)

/**
 * Sentido del mapeo (plan 4q): siempre va del CRM al ERP; si además se pide al ERP
 * (`includeInSourceQuery`), va en los dos sentidos. Nunca es solo del ERP al CRM.
 */
function Direction({ mapping }) {
  const both = mapping.includeInSourceQuery
  const text = both ? 'En los dos sentidos' : 'Del CRM al ERP'
  const Icon = both ? ArrowLeftRightIcon : ArrowRightIcon
  return (
    <span className="inline-flex text-direction" title={text}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  )
}

const columns = [
  { id: 'objectType', header: 'Objeto', cell: ({ row }) => objectLabel(row.original.objectType) },
  {
    id: 'sourceContext',
    header: 'Contexto',
    cell: ({ row }) => contextLabel(row.original.sourceContext),
  },
  {
    id: 'targetField',
    header: 'Propiedad en el CRM',
    cell: ({ row }) => fieldCell(row.original.targetField),
  },
  {
    id: 'direction',
    header: 'Direccionalidad',
    meta: { cellClassName: 'text-center' },
    cell: ({ row }) => <Direction mapping={row.original} />,
  },
  {
    id: 'sourceField',
    header: 'Campo en el ERP',
    cell: ({ row }) => fieldCell(row.original.sourceField),
  },
  {
    id: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="success">Activo</Badge>
      ) : (
        <Badge variant="muted">Inactivo</Badge>
      ),
  },
  { id: 'userField', header: 'Es un usuario', cell: ({ row }) => yesNo(row.original.userField) },
  {
    id: 'editable',
    header: 'Editable',
    cell: ({ row }) =>
      row.original.editable ? (
        'Sí'
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <LockIcon className="size-3.5" aria-hidden="true" />
          No
        </span>
      ),
  },
]

const getRowId = (row) => row.id

/** Mapeo de campos de la empresa, solo lectura (plan 4p, contrato I1 a I3). */
export function MappingsPage() {
  const scope = useScope()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const filters = {
    objeto: getFilter('objeto'),
    contexto: getFilter('contexto'),
    estado: pickOption(getFilter('estado'), STATUS_FILTERS),
    q: getFilter('q'),
  }
  const mappings = useFieldMappings(scope)
  const all = mappings.data
  // La API manda todos los mapeos: se filtra y pagina aquí (son pocos cientos como mucho).
  const filtered = all ? filterMappings(all, filters) : undefined
  const data = filtered && {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
  }
  const totals = all && summarize(all)
  const hasFilters = Boolean(filters.objeto || filters.contexto || filters.estado || filters.q)
  const whose = scope.picksTenant ? 'Esta empresa' : 'Tu empresa'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mapeo de campos</h1>
        <p className="text-sm text-muted-foreground">
          Qué campo del ERP llena cada propiedad del CRM. Solo lectura.
        </p>
      </div>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="su mapeo de campos" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
            {scope.picksTenant && (
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            )}
            <FilterSelect
              id="mappings-object-filter"
              label="Objeto"
              value={filters.objeto}
              options={all ? optionsFrom(all, 'objectType', objectLabel) : []}
              onChange={(value) => setFilter('objeto', value)}
            />
            <FilterSelect
              id="mappings-context-filter"
              label="Contexto"
              value={filters.contexto}
              options={all ? optionsFrom(all, 'sourceContext', contextLabel) : []}
              onChange={(value) => setFilter('contexto', value)}
            />
            <FilterSelect
              id="mappings-status-filter"
              label="Estado"
              value={filters.estado}
              options={STATUS_OPTIONS}
              onChange={(value) => setFilter('estado', value)}
            />
            <TextFilter
              id="mappings-search"
              label="Buscar"
              placeholder="Campo o propiedad"
              value={filters.q}
              onApply={(value) => setFilter('q', value)}
            />
          </div>

          {totals && (
            <ul aria-label="Resumen del mapeo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Mapeos', totals.total],
                ['Activos', totals.active],
                ['Inactivos', totals.inactive],
                ['Editables', totals.editable],
              ].map(([label, value]) => (
                <li key={label} className="flex">
                  <StatTile className="flex-1" label={label} value={formatNumber(value)} />
                </li>
              ))}
            </ul>
          )}

          <DataTable
            label="Mapeo de campos"
            columns={columns}
            data={data}
            getRowId={getRowId}
            page={page}
            pageSize={pageSize}
            onPaginationChange={setPagination}
            isPending={mappings.isPending}
            isFetching={mappings.isFetching}
            error={mappings.error}
            onRetry={mappings.refetch}
            emptyTitle={
              hasFilters
                ? 'Ningún mapeo coincide con los filtros'
                : `${whose} todavía no tiene mapeos de campos`
            }
          />
        </>
      )}
    </div>
  )
}
