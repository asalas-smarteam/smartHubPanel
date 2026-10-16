import { cn } from '@/lib/utils'

/**
 * Leyenda de colores. Es solo visual: los datos están en la tabla accesible de cada gráfico.
 * @param {{ items: Array<{ key: string, label: string, color: string, value?: string }>, className?: string }} props
 */
export function ChartLegend({ items, className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground', className)}
    >
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center">
          <i
            className="mr-2 inline-block size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          {item.value === undefined ? item.label : `${item.label} — ${item.value}`}
        </span>
      ))}
    </div>
  )
}
