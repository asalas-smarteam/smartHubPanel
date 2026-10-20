import { cn } from '@/lib/utils'

const TONES = {
  default: '',
  positive: 'text-positive',
  negative: 'text-destructive',
  warning: 'text-chart-warn',
}

/**
 * Indicador: etiqueta, valor grande y nota. `size="sm"` es la versión compacta (dentro de otra tarjeta).
 * @param {{ label: string, value: import('react').ReactNode, note?: import('react').ReactNode,
 *   tone?: 'default' | 'positive' | 'negative' | 'warning', size?: 'md' | 'sm', highlight?: boolean,
 *   className?: string, labelClassName?: string, valueClassName?: string }} props
 *   `highlight`: fondo con el color principal, para el dato que resume a los demás.
 */
export function StatTile({
  label,
  value,
  note,
  tone = 'default',
  size = 'md',
  highlight = false,
  className,
  labelClassName,
  valueClassName,
}) {
  const small = size === 'sm'
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex min-w-0 flex-col',
        small
          ? 'gap-0.5 rounded-[14px] bg-surface px-4 py-3.5'
          : highlight
            ? 'gap-1 rounded-[18px] bg-primary px-5 py-4 text-primary-foreground shadow-sm'
            : 'glass gap-1 rounded-[18px] px-5 py-4',
        className,
      )}
    >
      <p
        className={cn(
          highlight ? 'text-primary-foreground/85' : 'text-subtle-foreground',
          small ? 'text-xs' : 'font-mono text-[10.5px] tracking-[0.12em] uppercase',
          labelClassName,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'font-bold tracking-tight tabular-nums',
          small ? 'text-[26px] leading-tight' : 'text-[32px] leading-tight',
          !highlight && TONES[tone],
          valueClassName,
        )}
      >
        {value}
      </p>
      {note && (
        <p
          className={cn(
            'leading-snug',
            highlight ? 'text-primary-foreground/85' : 'text-muted-foreground',
            small ? 'text-xs' : 'text-[12.5px]',
          )}
        >
          {note}
        </p>
      )}
    </div>
  )
}
