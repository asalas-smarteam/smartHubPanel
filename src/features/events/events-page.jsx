import { useMemo } from 'react'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { DateRangeFilter } from '@/components/date-range-filter'
import { FilterSelect } from '@/components/filter-select'
import { TextFilter } from '@/components/text-filter'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { formatDateTime } from '@/lib/dates'
import { usePaginationParams } from '@/lib/pagination'

import { useEvents } from './api'
import { EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS, eventTypeLabel } from './constants'
import { EventStatusBadge } from './event-status-badge'

const linkClass =
  'font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'

/** Columnas: dependen solo del sufijo `?empresa=` de los enlaces (memo estable para la tabla). */
function buildColumns(search) {
  const to = (event) => `/eventos/${encodeURIComponent(event.id)}${search}`
  return [
    {
      id: 'createdAt',
      header: 'Fecha',
      cell: ({ row }) => (
        <Link to={to(row.original)} className={linkClass}>
          <time dateTime={row.original.createdAt}>{formatDateTime(row.original.createdAt)}</time>
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <Link to={to(row.original)} className={linkClass}>
          {eventTypeLabel(row.original.type)}
        </Link>
      ),
    },
    {
      id: 'reference',
      header: 'Referencia',
      cell: ({ row }) =>
        row.original.reference ? (
          <span className="font-mono text-xs">{row.original.reference}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Estado',
      meta: { cellClassName: 'whitespace-normal min-w-32' },
      cell: ({ row }) => <EventStatusBadge status={row.original.status} />,
    },
    {
      id: 'retries',
      header: 'Reintentos',
      cell: ({ row }) => `${row.original.retries}/${row.original.maxRetries}`,
    },
    {
      id: 'lastError',
      header: 'Último error',
      meta: { cellClassName: 'max-w-72' },
      cell: ({ row }) =>
        row.original.lastError ? (
          <span className="block truncate text-status-error-fg" title={row.original.lastError}>
            {row.original.lastError}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]
}

/** Eventos de la integración (E1); Smarteam los ve por empresa (E3). */
export function EventsPage() {
  const scope = useScope()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const filters = {
    status: getFilter('status'),
    type: getFilter('type'),
    reference: getFilter('referencia'),
    desde: getFilter('desde'),
    hasta: getFilter('hasta'),
  }
  const events = useEvents(scope, { page, pageSize, ...filters })
  const search = scopeSearch(scope)
  const columns = useMemo(() => buildColumns(search), [search])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Documentos que la integración procesó, del más reciente al más antiguo.
        </p>
      </div>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="sus eventos" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
            {scope.picksTenant && (
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            )}
            <FilterSelect
              id="events-status-filter"
              label="Estado"
              value={filters.status}
              options={EVENT_STATUS_OPTIONS}
              onChange={(value) => setFilter('status', value)}
            />
            <FilterSelect
              id="events-type-filter"
              label="Tipo"
              value={filters.type}
              options={EVENT_TYPE_OPTIONS}
              onChange={(value) => setFilter('type', value)}
            />
            <TextFilter
              id="events-reference-filter"
              label="Referencia"
              placeholder="Id del negocio"
              value={filters.reference}
              onApply={(value) => setFilter('referencia', value)}
            />
            <DateRangeFilter
              idPrefix="events-dates"
              from={filters.desde}
              to={filters.hasta}
              onChange={setFilter}
            />
          </div>

          <DataTable
            label="Eventos"
            columns={columns}
            data={events.data}
            page={page}
            pageSize={pageSize}
            onPaginationChange={setPagination}
            isPending={events.isPending}
            isFetching={events.isFetching}
            error={events.error}
            onRetry={events.refetch}
            emptyTitle="No hay eventos con estos filtros"
          />
        </>
      )}
    </div>
  )
}
