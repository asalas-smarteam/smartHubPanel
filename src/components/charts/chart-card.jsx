import { useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * Tarjeta de vidrio para un gráfico: título corto en mayúsculas, nota y acción opcional.
 * @param {{ title: string, description?: import('react').ReactNode, action?: import('react').ReactNode,
 *   surface?: 'default' | 'strong', className?: string, children?: import('react').ReactNode }} props
 */
export function ChartCard({
  title,
  description,
  action,
  surface = 'default',
  className,
  children,
}) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        surface === 'strong' ? 'glass-strong' : 'glass',
        'flex min-w-0 flex-col gap-4 rounded-[22px] p-5 sm:px-7 sm:py-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={titleId}
            className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
          >
            {title}
          </h2>
          {description && <p className="text-[13px] text-subtle-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0 text-[13px] font-semibold">{action}</div>}
      </div>
      {children}
    </section>
  )
}
