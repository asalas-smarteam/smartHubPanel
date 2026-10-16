import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { scaled, summarize } from './chart-summary'
import { ChartTable } from './chart-table'

// La barra más larga ocupa el 85 % de su pista: deja lugar al número que va a su lado.
const MAX_WIDTH = 85

/**
 * Barras horizontales con etiqueta a la izquierda y valor al lado de la barra.
 * @param {{ label: string, items: Array<{ key: string, label: string, value: number, color?: string, note?: string }>,
 *   max?: number, formatValue?: (value: number) => string, labelHeader?: string, valueHeader?: string,
 *   noteHeader?: string, empty?: string }} props
 */
export function BarList({
  label,
  items,
  max,
  formatValue = (value) => formatNumber(value),
  labelHeader = 'Nombre',
  valueHeader = 'Cantidad',
  noteHeader,
  empty = 'Sin datos en el período.',
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>

  const top = max ?? Math.max(...items.map((item) => item.value))
  const hasNotes = items.some((item) => item.note !== undefined)

  return (
    <>
      <div
        role="img"
        aria-label={summarize(
          label,
          items.map((item) => [item.label, formatValue(item.value)]),
        )}
        className={cn(
          'grid items-center gap-x-4 gap-y-2.5',
          hasNotes ? 'grid-cols-[fit-content(45%)_1fr_auto]' : 'grid-cols-[fit-content(45%)_1fr]',
        )}
      >
        {items.map((item) => {
          const width = scaled(item.value, top, MAX_WIDTH)
          return (
            <div key={item.key} className="contents">
              <span className="text-right text-[13.5px] leading-snug text-muted-foreground">
                {item.label}
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                {width > 0 && (
                  <i
                    data-slot="bar"
                    className="block h-[18px] min-w-1 rounded-r-md"
                    style={{ width: `${width}%`, backgroundColor: item.color ?? 'var(--chart-1)' }}
                  />
                )}
                <span className="font-mono text-[12.5px] tabular-nums">
                  {formatValue(item.value)}
                </span>
              </div>
              {hasNotes && (
                <span className="text-right font-mono text-xs text-subtle-foreground">
                  {item.note}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <ChartTable
        caption={label}
        headers={[labelHeader, valueHeader, ...(hasNotes && noteHeader ? [noteHeader] : [])]}
        rows={items.map((item) => ({
          key: item.key,
          cells: [
            item.label,
            formatValue(item.value),
            ...(hasNotes && noteHeader ? [item.note] : []),
          ],
        }))}
      />
    </>
  )
}
