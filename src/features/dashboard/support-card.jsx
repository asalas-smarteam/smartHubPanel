import { Link } from 'react-router'

import { ChartCard } from '@/components/charts/chart-card'
import { ColumnChart } from '@/components/charts/column-chart'
import { StatTile } from '@/components/charts/stat-tile'
import { ErrorState, LoadingState } from '@/components/page-states'
import { useTicketMetrics } from '@/features/metrics/api'
import { formatShortDate } from '@/lib/dates'
import { formatNumber, formatSeconds } from '@/lib/format'

/** "Tu soporte" en el Inicio del cliente: resumen de sus tickets en el mismo período (F7). */
export function SupportCard({ days }) {
  const metrics = useTicketMetrics({ days })
  const totals = metrics.data?.totals

  return (
    <ChartCard
      title="Tu soporte"
      action={
        <Link to="/metricas" className="text-link underline-offset-4 hover:underline">
          Ver métricas
        </Link>
      }
    >
      {metrics.isPending && <LoadingState className="py-6" />}
      {metrics.isError && !metrics.data && (
        <ErrorState error={metrics.error} onRetry={metrics.refetch} className="py-6" />
      )}
      {totals && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              size="sm"
              label="Resueltos"
              value={formatNumber(totals.resolved)}
              note={`en los últimos ${days} días`}
            />
            <StatTile
              size="sm"
              label="Resolución (mediana)"
              value={formatSeconds(totals.medianResolutionSeconds)}
              note="desde que se abre"
            />
            <StatTile
              size="sm"
              label="Primera respuesta"
              value={formatSeconds(totals.medianFirstResponseSeconds)}
              note="mediana"
            />
            <StatTile
              size="sm"
              label="Abiertos"
              value={formatNumber(totals.open)}
              note={
                totals.openWithoutFirstResponse
                  ? `${totals.openWithoutFirstResponse} sin primera respuesta`
                  : 'todos con respuesta'
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[12.5px] text-subtle-foreground">Tickets resueltos por semana</p>
            <ColumnChart
              size="sm"
              label="Tickets resueltos por semana"
              labelHeader="Semana"
              primary={{ label: 'Resueltos', color: 'var(--chart-1)' }}
              columns={metrics.data.byWeek.map((week) => ({
                key: week.weekStart,
                label: formatShortDate(week.weekStart),
                value: week.resolved,
              }))}
            />
          </div>
        </>
      )}
    </ChartCard>
  )
}
