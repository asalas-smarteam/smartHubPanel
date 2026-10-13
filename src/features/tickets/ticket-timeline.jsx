import { formatDateTime } from '@/lib/dates'

import { STATUS_LABELS } from './constants'

function describe(entry) {
  if (entry.from === null) return `Abierto por ${entry.byName}`
  if (entry.to === 'resuelto') return `Resuelto por ${entry.byName}`
  if (entry.from === 'resuelto' && entry.to === 'abierto') return `Reabierto por ${entry.byName}`
  if (entry.from === 'resuelto') return `Vuelto a trabajar por ${entry.byName}`
  return `${STATUS_LABELS[entry.to]} · ${entry.byName}`
}

/**
 * Línea de tiempo de control de calidad (S12): apertura, primera respuesta, cambios de estado,
 * resoluciones y reaperturas.
 */
export function TicketTimeline({ ticket }) {
  const events = ticket.statusHistory.map((entry, index) => ({
    key: `h-${index}`,
    at: entry.at,
    text: describe(entry),
  }))
  if (ticket.firstResponseAt) {
    events.push({
      key: 'first-response',
      at: ticket.firstResponseAt,
      text: 'Primera respuesta de Smarteam',
    })
  }
  events.sort((a, b) => a.at.localeCompare(b.at))

  return (
    <section aria-label="Línea de tiempo" className="flex flex-col gap-3">
      <ol className="relative flex flex-col gap-3 border-l border-brand-blue-pale pl-4">
        {events.map((event) => (
          <li key={event.key} className="relative text-sm">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-brand-royal"
            />
            <p className="font-medium">{event.text}</p>
            <time className="text-xs text-muted-foreground" dateTime={event.at}>
              {formatDateTime(event.at)}
            </time>
          </li>
        ))}
      </ol>
      {ticket.reopenCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Reaperturas: <strong className="text-foreground">{ticket.reopenCount}</strong>
        </p>
      )}
    </section>
  )
}
