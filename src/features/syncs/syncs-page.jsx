import { useCallback, useMemo } from 'react'
import { Link } from 'react-router'

import { DurationSummary } from '@/components/charts/duration-summary'
import { DataTable } from '@/components/data-table/data-table'
import { DateRangeFilter } from '@/components/date-range-filter'
import { FilterSelect } from '@/components/filter-select'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { formatDateTime, formatDuration } from '@/lib/dates'
import { DATE_WINDOW_HINT, pickOption, RESULTS_WINDOW, usePaginationParams } from '@/lib/pagination'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { DURATIONS_LIMIT, useSyncDurations, useSyncs, useSyncTasks } from './api'
import {
  MISSING_TASK_LABEL,
  OBJECT_TYPE_LABELS,
  SYNC_STATUS_OPTIONS,
  isValidTaskId,
  SYNC_STATUSES,
} from './constants'
import { SyncStatusBadge } from './sync-status-badge'

const numberFormat = new Intl.NumberFormat('es')
const countColumn = (key, header, { danger = false } = {}) => ({
  id: key,
  header,
  meta: { cellClassName: 'text-right tabular-nums' },
  cell: ({ row }) => {
    const value = row.original.counts[key]
    return (
      <span className={cn(danger && value > 0 && 'font-semibold text-status-error-fg')}>
        {numberFormat.format(value)}
      </span>
    )
  },
})

function buildColumns(search) {
  return [
    {
      id: 'startedAt',
      header: 'Inicio',
      cell: ({ row }) => (
        <Link
          to={`/syncs/${encodeURIComponent(row.original.id)}${search}`}
          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          <time dateTime={row.original.startedAt}>{formatDateTime(row.original.startedAt)}</time>
        </Link>
      ),
    },
    {
      id: 'task',
      header: 'Tarea',
      cell: ({ row }) => row.original.task?.name ?? MISSING_TASK_LABEL,
    },
    {
      id: 'objectType',
      header: 'Objeto',
      cell: ({ row }) =>
        OBJECT_TYPE_LABELS[row.original.objectType] ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <SyncStatusBadge status={row.original.status} />,
    },
    countColumn('processed', 'Procesados'),
    countColumn('sent', 'Enviados'),
    countColumn('failed', 'Fallidos', { danger: true }),
    countColumn('skipped', 'Omitidos'),
    {
      id: 'duration',
      header: 'Duración',
      cell: ({ row }) =>
        formatDuration(row.original.startedAt, row.original.finishedAt, 'En curso'),
    },
  ]
}

/** Corridas de sincronización (E2); Smarteam las ve por empresa (E3). */
export function SyncsPage() {
  const scope = useScope()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const filters = {
    // Valores que el backend rechazaría (400) se ignoran: vienen de una URL editada a mano.
    taskId: isValidTaskId(getFilter('taskId')) ? getFilter('taskId') : '',
    status: pickOption(getFilter('status'), SYNC_STATUSES),
    desde: getFilter('desde'),
    hasta: getFilter('hasta'),
    // Activado por defecto: `?vacias=1` muestra también las corridas sin cambios.
    hideEmpty: getFilter('vacias') !== '1',
  }
  const syncs = useSyncs(scope, { page, pageSize, ...filters })
  const durations = useSyncDurations(scope, filters)
  const tasks = useSyncTasks(scope)
  const taskOptions = (tasks.data ?? []).map((task) => ({ value: task.id, label: task.name }))
  const search = scopeSearch(scope)
  const columns = useMemo(() => buildColumns(search), [search])
  const rowHref = useCallback((row) => `/syncs/${encodeURIComponent(row.id)}${search}`, [search])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Syncs</h1>
        <p className="text-sm text-muted-foreground">
          Corridas de sincronización, de la más reciente a la más antigua.
        </p>
      </div>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="sus syncs" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
            {scope.picksTenant && (
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            )}
            <FilterSelect
              id="syncs-task-filter"
              label="Tarea"
              allLabel="Todas"
              value={filters.taskId}
              options={taskOptions}
              onChange={(value) => setFilter('taskId', value)}
            />
            <FilterSelect
              id="syncs-status-filter"
              label="Estado"
              value={filters.status}
              options={SYNC_STATUS_OPTIONS}
              onChange={(value) => setFilter('status', value)}
            />
            <DateRangeFilter
              idPrefix="syncs-dates"
              from={filters.desde}
              to={filters.hasta}
              onChange={setFilter}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={filters.hideEmpty}
                onChange={(event) => setFilter('vacias', event.target.checked ? '' : '1')}
              />
              Ocultar corridas sin cambios
            </label>
          </div>

          <DurationSummary
            query={durations}
            title="Duración promedio por tarea"
            description="Corridas terminadas del filtro; las que están en curso no cuentan."
            cappedNote={`Se usaron las ${formatNumber(DURATIONS_LIMIT)} más recientes.`}
            noun={{ one: 'corrida', other: 'corridas' }}
            unavailable={
              filters.status === 'running'
                ? 'Las corridas en curso todavía no tienen duración.'
                : null
            }
            empty="No hay corridas terminadas con estos filtros."
          />

          <DataTable
            rowHref={rowHref}
            label="Syncs"
            columns={columns}
            data={syncs.data}
            page={page}
            pageSize={pageSize}
            onPaginationChange={setPagination}
            isPending={syncs.isPending}
            isFetching={syncs.isFetching}
            error={syncs.error}
            onRetry={syncs.refetch}
            emptyTitle="No hay corridas con estos filtros"
            maxResults={RESULTS_WINDOW}
            windowHint={DATE_WINDOW_HINT}
          />
        </>
      )}
    </div>
  )
}
