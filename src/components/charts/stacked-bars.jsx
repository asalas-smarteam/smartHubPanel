import { formatNumber } from '@/lib/format'

import { scaled, summarize } from './chart-summary'
import { ChartTable } from './chart-table'

const total = (row, series) => series.reduce((sum, s) => sum + (row.values[s.key] || 0), 0)

/**
 * Una fila por período con segmentos apilados (p. ej. creados y con error por día).
 * El largo de la fila es su total sobre el mayor; a la derecha, "primera serie / total".
 * @param {{ label: string, series: Array<{ key: string, label: string, color: string }>,
 *   rows: Array<{ key: string, label: string, values: Record<string, number> }>, labelHeader?: string }} props
 */
export function StackedBars({ label, series, rows, labelHeader = 'Período' }) {
  const max = Math.max(0, ...rows.map((row) => total(row, series)))
  const [first] = series

  return (
    <>
      <div
        role="img"
        aria-label={summarize(
          label,
          series.map((s) => [
            s.label,
            formatNumber(rows.reduce((sum, row) => sum + (row.values[s.key] || 0), 0)),
          ]),
        )}
        className="flex flex-col gap-2"
      >
        {rows.map((row) => {
          const rowTotal = total(row, series)
          return (
            <div key={row.key} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3">
              <span className="text-right text-[12.5px] text-muted-foreground">{row.label}</span>
              <div
                data-slot="stack"
                className="flex h-4 gap-0.5"
                style={{ width: `${scaled(rowTotal, max)}%` }}
              >
                {series
                  .filter((s) => row.values[s.key] > 0)
                  .map((s) => (
                    <i
                      key={s.key}
                      data-slot="bar"
                      className="block min-w-0.5 rounded"
                      style={{ flexGrow: row.values[s.key], backgroundColor: s.color }}
                    />
                  ))}
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                <b className="text-foreground">{formatNumber(row.values[first.key] || 0)}</b>/
                {formatNumber(rowTotal)}
              </span>
            </div>
          )
        })}
      </div>
      <ChartTable
        caption={label}
        headers={[labelHeader, ...series.map((s) => s.label), 'Total']}
        rows={rows.map((row) => ({
          key: row.key,
          cells: [
            row.label,
            ...series.map((s) => formatNumber(row.values[s.key] || 0)),
            formatNumber(total(row, series)),
          ],
        }))}
      />
    </>
  )
}
