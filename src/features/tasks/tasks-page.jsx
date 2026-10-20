import { Link } from 'react-router'
import { useCallback, useMemo } from 'react'

import { StatTile } from '@/components/charts/stat-tile'
import { DataTable } from '@/components/data-table/data-table'
import { FilterSelect } from '@/components/filter-select'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { formatDateTime } from '@/lib/dates'
import { formatNumber } from '@/lib/format'
import { pickOption, usePaginationParams } from '@/lib/pagination'

import { useScheduledTasks } from './api'
import {
  EMPTY_VALUE,
  modeLabel,
  objectLabel,
  STATUS_FILTERS,
  STATUS_OPTIONS,
  taskTypeLabel,
  timeZoneLabel,
} from './constants'
import { filterTasks, summarizeTasks, taskOptions } from './filters'
import { describeSchedule } from './schedule'
import { LastRun, TaskStatusBadge } from './task-status'

const linkClass =
  'font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'

function buildColumns(search) {
  return [
    {
      id: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <Link to={`/tareas/${encodeURIComponent(row.original.id)}${search}`} className={linkClass}>
          {row.original.name ?? EMPTY_VALUE}
        </Link>
      ),
    },
    { id: 'objectType', header: 'Objeto', cell: ({ row }) => objectLabel(row.original.objectType) },
    { id: 'type', header: 'Tipo', cell: ({ row }) => taskTypeLabel(row.original.type) },
    { id: 'mode', header: 'Modo', cell: ({ row }) => modeLabel(row.original.mode) },
    {
      id: 'schedule',
      header: 'Horario',
      meta: { cellClassName: 'whitespace-normal min-w-36' },
      cell: ({ row }) => describeSchedule(row.original.schedule)?.when ?? 'Sin programación',
    },
    {
      id: 'days',
      header: 'Días',
      meta: { cellClassName: 'whitespace-normal min-w-28' },
      cell: ({ row }) =>
        describeSchedule(row.original.schedule)?.days ?? (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        ),
    },
    {
      id: 'active',
      header: 'Estado',
      cell: ({ row }) => <TaskStatusBadge active={row.original.active} />,
    },
    {
      id: 'lastRunAt',
      header: 'Última corrida',
      cell: ({ row }) => <LastRun task={row.original} />,
    },
    {
      id: 'nextRunAt',
      header: 'Próxima',
      cell: ({ row }) =>
        row.original.nextRunAt ? (
          formatDateTime(row.original.nextRunAt)
        ) : (
          <span className="text-muted-foreground">{EMPTY_VALUE}</span>
        ),
    },
    {
      id: 'syncs',
      header: <span className="sr-only">Corridas</span>,
      cell: ({ row }) => (
        <Link
          to={`/syncs${search ? `${search}&` : '?'}taskId=${encodeURIComponent(row.original.id)}`}
          className="text-sm whitespace-nowrap text-link underline-offset-4 hover:underline"
        >
          Ver corridas
        </Link>
      ),
    },
  ]
}

/** Tareas programadas de la empresa, solo lectura (plan 4r, contrato J1 a J4). */
export function TasksPage() {
  const scope = useScope()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const filters = {
    estado: pickOption(getFilter('estado'), STATUS_FILTERS),
    objeto: getFilter('objeto'),
    tipo: getFilter('tipo'),
  }
  const tasks = useScheduledTasks(scope)
  const all = tasks.data
  const filtered = all ? filterTasks(all, filters) : undefined
  const data = filtered && {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
  }
  const totals = all && summarizeTasks(all)
  const options = all ? taskOptions(all) : { objects: [], types: [] }
  const zone = timeZoneLabel(all?.find((task) => task.schedule.timeZone)?.schedule.timeZone)
  const search = scopeSearch(scope)
  const columns = useMemo(() => buildColumns(search), [search])
  const rowHref = useCallback((row) => `/tareas/${encodeURIComponent(row.id)}${search}`, [search])
  const hasFilters = Boolean(filters.estado || filters.objeto || filters.tipo)
  const whose = scope.picksTenant ? 'Esta empresa' : 'Tu empresa'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tareas programadas</h1>
        <p className="text-sm text-muted-foreground">
          Las sincronizaciones configuradas y cuándo corren
          {zone ? ` (horas en ${zone})` : ''}. Solo lectura.
        </p>
      </div>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="sus tareas programadas" />
      ) : (
        <>
          <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
            {scope.picksTenant && (
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            )}
            <FilterSelect
              id="tasks-status-filter"
              label="Estado"
              allLabel="Todas"
              value={filters.estado}
              options={STATUS_OPTIONS}
              onChange={(value) => setFilter('estado', value)}
            />
            <FilterSelect
              id="tasks-object-filter"
              label="Objeto"
              value={filters.objeto}
              options={options.objects}
              onChange={(value) => setFilter('objeto', value)}
            />
            <FilterSelect
              id="tasks-type-filter"
              label="Tipo"
              value={filters.tipo}
              options={options.types}
              onChange={(value) => setFilter('tipo', value)}
            />
          </div>

          {totals && (
            <ul aria-label="Resumen de tareas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Tareas', totals.total],
                ['Activas', totals.active],
                ['Inactivas', totals.inactive],
                ['Con error', totals.withError],
              ].map(([label, value]) => (
                <li key={label} className="flex">
                  <StatTile
                    className="flex-1"
                    label={label}
                    value={formatNumber(value)}
                    tone={label === 'Con error' && value > 0 ? 'negative' : 'default'}
                  />
                </li>
              ))}
            </ul>
          )}

          <DataTable
            rowHref={rowHref}
            label="Tareas programadas"
            columns={columns}
            data={data}
            getRowId={(row) => row.id}
            page={page}
            pageSize={pageSize}
            onPaginationChange={setPagination}
            isPending={tasks.isPending}
            isFetching={tasks.isFetching}
            error={tasks.error}
            onRetry={tasks.refetch}
            emptyTitle={
              hasFilters
                ? 'Ninguna tarea coincide con los filtros'
                : `${whose} todavía no tiene tareas programadas`
            }
          />
        </>
      )}
    </div>
  )
}
