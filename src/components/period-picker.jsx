import { cn } from '@/lib/utils'

/**
 * Botones de período (uno activo, `aria-pressed`). Lo usan el Inicio y Métricas.
 * @param {{ value: number, options: Array<{ value: number, label: string }>,
 *   onChange: (value: number) => void }} props
 */
export function PeriodPicker({ value, options, onChange }) {
  return (
    <div role="group" aria-label="Período" className="glass flex gap-1 rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-2 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            option.value === value
              ? 'bg-foreground font-bold text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
