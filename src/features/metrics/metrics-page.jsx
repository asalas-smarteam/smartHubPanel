import { AlertTriangleIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { BarList } from '@/components/charts/bar-list'
import { ChartCard } from '@/components/charts/chart-card'
import { ColumnChart } from '@/components/charts/column-chart'
import { StatTile } from '@/components/charts/stat-tile'
import { FilterSelect } from '@/components/filter-select'
import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
import { PeriodPicker } from '@/components/period-picker'
import { PERMISSIONS, usePermissions } from '@/features/auth/permissions'
import { useSession } from '@/features/auth/session'
import { useTenants } from '@/features/tenants/api'
import { TICKET_CATEGORIES } from '@/features/tickets/constants'
import { CATEGORY_OPTIONS } from '@/features/tickets/options'
import { formatShortDate } from '@/lib/dates'
import { formatNumber, formatPercent, formatSeconds } from '@/lib/format'
import { pickOption } from '@/lib/pagination'

import { useTicketMetrics } from './api'
import {
  BUCKETS,
  CATEGORY_PARAM,
  DEFAULT_METRICS_PERIOD,
  METRICS_PERIODS,
  MONTHLY_FROM_DAYS,
  PERIOD_PARAM,
  REOPENED_SERIES,
  RESOLVED_SERIES,
  TENANT_FILTER_PARAM,
} from './constants'
import {
  bucketSentence,
  categoryLabel,
  categorySentence,
  comparisonNote,
  monthRows,
} from './summaries'

const PERIOD_VALUES = METRICS_PERIODS.map((period) => period.value)

/** Filtros en la URL: `?periodo=30&empresa=…&categoria=…`. Los valores desconocidos se ignoran. */
function useMetricsFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = Number(searchParams.get(PERIOD_PARAM))
  const days = PERIOD_VALUES.includes(value) ? value : DEFAULT_METRICS_PERIOD
  const set = (name, next, fallback = '') =>
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (!next || next === fallback) params.delete(name)
      else params.set(name, String(next))
      return params
    })
  return {
    days,
    tenantParam: searchParams.get(TENANT_FILTER_PARAM) ?? '',
    category: pickOption(searchParams.get(CATEGORY_PARAM) ?? '', TICKET_CATEGORIES),
    setDays: (next) => set(PERIOD_PARAM, next, DEFAULT_METRICS_PERIOD),
    setTenant: (next) => set(TENANT_FILTER_PARAM, next),
    setCategory: (next) => set(CATEGORY_PARAM, next),
  }
}

function Indicators({ totals, phrase }) {
  return (
    <section
      aria-label="Indicadores"
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5"
    >
      <StatTile
        label="Resueltos"
        value={formatNumber(totals.resolved)}
        tone={totals.resolved > 0 ? 'positive' : 'default'}
        note={comparisonNote(totals.resolved, totals.resolvedPreviousPeriod, phrase)}
      />
      <StatTile
        label="Primera respuesta"
        value={formatSeconds(totals.medianFirstResponseSeconds)}
        note="mediana desde que se abre"
      />
      <StatTile
        label="Resolución"
        value={formatSeconds(totals.medianResolutionSeconds)}
        note="mediana desde que se abre hasta resuelto"
      />
      <StatTile
        label="Reabiertos"
        value={formatPercent(totals.reopened, totals.resolved, 0)}
        tone={totals.reopened > 0 ? 'negative' : 'default'}
        note={`${formatNumber(totals.reopened)} de ${formatNumber(totals.resolved)} volvieron con "Sigue fallando"`}
      />
      <StatTile
        label="Abiertos ahora"
        value={formatNumber(totals.open)}
        note={
          totals.openWithoutFirstResponse > 0
            ? `${formatNumber(totals.openWithoutFirstResponse)} todavía sin primera respuesta`
            : 'todos con primera respuesta'
        }
      />
    </section>
  )
}

function ResolvedOverTime({ byWeek, monthly }) {
  const title = monthly ? 'Resueltos por mes' : 'Resueltos por semana y tiempo de resolución'
  const columns = monthly
    ? monthRows(byWeek).map((month) => ({
        key: month.key,
        label: month.label,
        value: month.resolved,
        secondary: month.reopened,
      }))
    : byWeek.map((week) => ({
        key: week.weekStart,
        label: formatShortDate(week.weekStart),
        value: week.resolved,
        secondary: week.reopened,
        note: formatSeconds(week.medianResolutionSeconds, { compact: true }),
      }))
  return (
    <ChartCard
      title={title}
      description={
        monthly
          ? 'La barra es cuántos se resolvieron cada mes; la mediana de resolución del período está arriba.'
          : 'La barra es cuántos se resolvieron; el número de abajo, la mediana hasta resolver.'
      }
    >
      <ColumnChart
        label={title}
        labelHeader={monthly ? 'Mes' : 'Semana'}
        noteHeader={monthly ? undefined : 'Mediana de resolución'}
        primary={RESOLVED_SERIES}
        secondary={REOPENED_SERIES}
        columns={columns}
      />
    </ChartCard>
  )
}

function Buckets({ buckets }) {
  const total = buckets.reduce((acc, bucket) => acc + bucket.count, 0)
  return (
    <ChartCard title="¿En cuánto tiempo se resuelven?" description={bucketSentence(buckets)}>
      <BarList
        label="Tickets por tiempo de resolución"
        labelHeader="Tiempo"
        valueHeader="Tickets"
        noteHeader="Porcentaje"
        items={buckets.map((bucket) => ({
          key: bucket.key,
          label: BUCKETS[bucket.key].label,
          value: bucket.count,
          color: BUCKETS[bucket.key].color,
          note: formatPercent(bucket.count, total, 0),
        }))}
      />
    </ChartCard>
  )
}

function Categories({ byCategory }) {
  return (
    <ChartCard title="Por categoría" description={categorySentence(byCategory)}>
      <BarList
        label="Resueltos por categoría"
        labelHeader="Categoría"
        valueHeader="Resueltos"
        noteHeader="Mediana de resolución"
        empty="Ninguna categoría con tickets resueltos."
        items={byCategory.map((entry) => ({
          key: entry.category,
          label: categoryLabel(entry.category),
          value: entry.resolved,
          color: 'var(--chart-1)',
          note: formatSeconds(entry.medianResolutionSeconds),
        }))}
      />
    </ChartCard>
  )
}

const cellClass = 'px-3 py-2.5 text-right tabular-nums'

function ByTenant({ rows }) {
  return (
    <ChartCard
      title="Por empresa"
      description={
        'Tiempos en mediana; los reabiertos son tickets que el cliente marcó como "Sigue fallando".'
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna empresa con tickets en el período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Métricas por empresa</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Empresa
                </th>
                {['Resueltos', 'Primera respuesta', 'Resolución', 'Reabiertos', 'Abiertos'].map(
                  (header) => (
                    <th key={header} scope="col" className="px-3 py-2 text-right font-medium">
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tenantKey} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-left font-semibold">
                    {row.companyName ?? row.tenantKey}
                  </th>
                  <td className={cellClass}>{formatNumber(row.resolved)}</td>
                  <td className={cellClass}>{formatSeconds(row.medianFirstResponseSeconds)}</td>
                  <td className={cellClass}>{formatSeconds(row.medianResolutionSeconds)}</td>
                  <td className={cellClass}>{formatNumber(row.reopened)}</td>
                  <td className={cellClass}>{formatNumber(row.open)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  )
}

/** Aviso de empresas que no respondieron (G6: `warnings` en la ruta de Smarteam). */
function Warnings({ warnings, tenants }) {
  if (!warnings?.length) return null
  const names = warnings.map(
    (warning) =>
      tenants?.find((tenant) => tenant.tenantKey === warning.tenantKey)?.companyName ??
      warning.tenantKey,
  )
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-status-waiting-fg/30 bg-status-waiting-bg px-4 py-3 text-sm text-status-waiting-fg"
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        No se pudieron sumar las métricas de: <strong>{names.join(', ')}</strong>. Las cifras son
        del resto de las empresas.
      </p>
    </div>
  )
}

function Content({ data, phrase, monthly, staff, tenants }) {
  const { totals } = data
  const nothing = totals.resolved === 0 && totals.open === 0 && totals.reopened === 0
  return (
    <>
      {staff && <Warnings warnings={data.warnings} tenants={tenants} />}
      <Indicators totals={totals} phrase={phrase} />
      {nothing ? (
        <div className="glass rounded-xl">
          <EmptyState title="Todavía no hay tickets en este período">
            Cuando se resuelvan tickets, vas a ver aquí cuántos y en cuánto tiempo.
          </EmptyState>
        </div>
      ) : (
        <>
          <ResolvedOverTime byWeek={data.byWeek} monthly={monthly} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Buckets buckets={data.buckets} />
            <Categories byCategory={data.byCategory} />
          </div>
          {staff && <ByTenant rows={data.byTenant} />}
        </>
      )}
    </>
  )
}

/** Métricas de soporte (F7, F8): Smarteam ve todas las empresas; el cliente, la suya. */
export function MetricsPage() {
  const { can } = usePermissions()
  const staff = can(PERMISSIONS.STAFF_TICKETS)
  const { data: session } = useSession()
  const filters = useMetricsFilters()
  const tenants = useTenants({ enabled: staff })
  // Una empresa que no está en la lista se ignora (el backend respondería 404).
  const tenant = staff
    ? tenants.data?.find((entry) => entry.tenantKey === filters.tenantParam)
    : undefined
  const waitingTenants = staff && Boolean(filters.tenantParam) && !tenants.data
  const metrics = useTicketMetrics({
    staff,
    days: filters.days,
    tenantKey: tenant?.tenantKey,
    category: filters.category,
    enabled: !waitingTenants,
  })

  const period = METRICS_PERIODS.find((entry) => entry.value === filters.days)
  const scopeName = staff
    ? (tenant?.companyName ?? 'Todas las empresas')
    : session?.user?.companyName

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-subtle-foreground uppercase">
            {[scopeName, `últimos ${period.phrase}`].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-[34px]">
            Métricas de soporte
          </h1>
          <p className="text-sm text-muted-foreground">
            {staff
              ? 'Cuántos tickets se resuelven y en cuánto tiempo. El cliente ve esta misma pantalla, solo con los de su empresa.'
              : 'Cuántos tickets de tu empresa se resuelven y en cuánto tiempo.'}
          </p>
        </div>
        <PeriodPicker value={filters.days} options={METRICS_PERIODS} onChange={filters.setDays} />
      </header>

      {staff && (
        <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
          <FilterSelect
            id="metrics-tenant-filter"
            label="Empresa"
            allLabel="Todas"
            value={tenant?.tenantKey ?? ''}
            options={(tenants.data ?? []).map((entry) => ({
              value: entry.tenantKey,
              label: entry.companyName,
            }))}
            onChange={filters.setTenant}
          />
          <FilterSelect
            id="metrics-category-filter"
            label="Categoría"
            allLabel="Todas"
            value={filters.category}
            options={CATEGORY_OPTIONS}
            onChange={filters.setCategory}
          />
        </div>
      )}

      {(metrics.isPending || waitingTenants) && <LoadingState />}
      {metrics.isError && !metrics.data && (
        <div className="glass rounded-xl">
          <ErrorState error={metrics.error} onRetry={metrics.refetch} />
        </div>
      )}
      {metrics.data && (
        <Content
          data={metrics.data}
          phrase={period.phrase}
          monthly={filters.days >= MONTHLY_FROM_DAYS}
          staff={staff}
          tenants={tenants.data}
        />
      )}
    </div>
  )
}
