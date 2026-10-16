import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ChartLegend } from './chart-legend'
import { scaled, summarize } from './chart-summary'
import { ChartTable } from './chart-table'

const sum = (columns, field) => columns.reduce((acc, column) => acc + (column[field] || 0), 0)

/**
 * Columnas por semana o mes: serie principal arriba, secundaria (opcional) debajo,
 * el valor sobre cada columna y, abajo, el rótulo y una nota (p. ej. la mediana).
 * @param {{ label: string, columns: Array<{ key: string, label: string, value: number, secondary?: number, note?: string }>,
 *   primary: { label: string, color: string }, secondary?: { label: string, color: string },
 *   labelHeader?: string, noteHeader?: string, size?: 'md' | 'sm' }} props
 */
export function ColumnChart({
  label,
  columns,
  primary,
  secondary,
  labelHeader = 'Período',
  noteHeader,
  size = 'md',
}) {
  const max = Math.max(
    0,
    ...columns.map((c) => (c.value || 0) + (secondary ? c.secondary || 0 : 0)),
  )
  const hasNotes = columns.some((c) => c.note !== undefined)
  // La versión compacta (dentro de otra tarjeta) no lleva rótulos debajo: están en la tabla.
  const small = size === 'sm'
  const summary = summarize(label, [
    [primary.label, formatNumber(sum(columns, 'value'))],
    ...(secondary ? [[secondary.label, formatNumber(sum(columns, 'secondary'))]] : []),
  ])

  return (
    <div className="flex flex-col gap-3">
      {secondary && (
        <ChartLegend
          className="justify-end"
          items={[
            { key: 'primary', ...primary },
            { key: 'secondary', ...secondary },
          ]}
        />
      )}
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={summary}
          className="flex flex-col gap-2"
          style={{ minWidth: `${columns.length * (small ? 1.5 : 2.75)}rem` }}
        >
          <div
            className={cn(
              'flex items-end gap-2 border-b border-border pb-1 sm:gap-2.5',
              small ? 'h-24' : 'h-56',
            )}
          >
            {columns.map((column) => {
              const main = scaled(column.value, max)
              const extra = secondary ? scaled(column.secondary, max) : 0
              return (
                <div
                  key={column.key}
                  className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <span className="font-mono text-[11.5px] text-foreground tabular-nums">
                    {formatNumber(column.value || 0)}
                  </span>
                  <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
                    {main > 0 && (
                      <i
                        data-slot="bar"
                        className="block w-full rounded-t-lg rounded-b-sm"
                        style={{ height: `${main}%`, backgroundColor: primary.color }}
                      />
                    )}
                    {extra > 0 && (
                      <i
                        data-slot="bar"
                        className="block min-h-1 w-full rounded-sm"
                        style={{ height: `${extra}%`, backgroundColor: secondary.color }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className={cn('flex gap-2 sm:gap-2.5', small && 'hidden')}>
            {columns.map((column) => (
              <div key={column.key} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                <span className="text-[11.5px] whitespace-nowrap text-subtle-foreground">
                  {column.label}
                </span>
                {hasNotes && (
                  <span className="font-mono text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground">
                    {column.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ChartTable
        caption={label}
        headers={[
          labelHeader,
          primary.label,
          ...(secondary ? [secondary.label] : []),
          ...(hasNotes && noteHeader ? [noteHeader] : []),
        ]}
        rows={columns.map((column) => ({
          key: column.key,
          cells: [
            column.label,
            formatNumber(column.value || 0),
            ...(secondary ? [formatNumber(column.secondary || 0)] : []),
            ...(hasNotes && noteHeader ? [column.note] : []),
          ],
        }))}
      />
    </div>
  )
}
