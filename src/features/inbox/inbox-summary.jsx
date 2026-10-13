import { STATUS_LABELS, TICKET_STATUSES } from '@/features/tickets/constants'
import { cn } from '@/lib/utils'

const numberFormat = new Intl.NumberFormat('es')

/**
 * Contadores por estado (S5). Cada uno filtra la bandeja por ese estado; el activo se marca
 * y al tocarlo de nuevo se quita el filtro.
 */
export function InboxSummary({ summary, activeStatus, onSelect }) {
  return (
    <div
      role="group"
      aria-label="Tickets por estado"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {TICKET_STATUSES.map((status) => {
        const active = activeStatus === status
        const count = summary?.byStatus?.[status]
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : status)}
            className={cn(
              'glass flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              active ? 'ring-2 ring-brand-royal' : 'hover:shadow-[var(--shadow-card-hover)]',
            )}
          >
            <span className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</span>
            <span className="text-2xl font-bold tabular-nums">
              {count === undefined ? '—' : numberFormat.format(count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
