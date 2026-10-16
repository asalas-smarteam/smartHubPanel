import { formatNumber, formatPercent } from '@/lib/format'

import { ChartLegend } from './chart-legend'
import { ChartTable } from './chart-table'

/**
 * Barra de proporción (partes de un total) con leyenda.
 * @param {{ label: string, segments: Array<{ key: string, label: string, value: number, color: string }> }} props
 */
export function RatioBar({ label, segments }) {
  const total = segments.reduce((sum, segment) => sum + (segment.value || 0), 0)
  const summary =
    total > 0
      ? `${label}: ${segments.map((s) => `${s.label} ${formatNumber(s.value)}`).join(', ')} (total ${formatNumber(total)})`
      : `${label}: sin datos`

  return (
    <div className="flex flex-col gap-3.5">
      <div
        role="img"
        aria-label={summary}
        className="flex h-[30px] gap-[3px] overflow-hidden rounded-[10px] bg-surface"
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span
              key={segment.key}
              data-slot="bar"
              className="min-w-1 rounded-md"
              style={{ flexGrow: segment.value, backgroundColor: segment.color }}
            />
          ))}
      </div>
      <ChartLegend
        items={segments.map((s) => ({ ...s, value: formatNumber(s.value) }))}
        className="gap-x-7"
      />
      <ChartTable
        caption={label}
        headers={['Parte', 'Cantidad', 'Porcentaje']}
        rows={segments.map((s) => ({
          key: s.key,
          cells: [s.label, formatNumber(s.value), formatPercent(s.value, total, 0)],
        }))}
      />
    </div>
  )
}
