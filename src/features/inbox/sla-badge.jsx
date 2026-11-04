import { CheckIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { formatSlaDuration, slaText, ticketSla } from './sla'
import { formatDueAt } from './sla-format'

// pending neutro, warning ámbar, overdue rojo; cumplidas (met / missed) en gris tenue.
const STYLES = {
  pending: { variant: 'muted' },
  warning: { variant: 'warning' },
  overdue: { variant: 'error' },
  met: { variant: 'outline', className: 'text-muted-foreground' },
  missed: { variant: 'outline', className: 'border-dashed text-muted-foreground/80' },
}

const DONE_LABEL = { firstResponse: 'Respondido', resolution: 'Resuelto' }

/** Detalle del vencimiento (para `title` y lectores de pantalla). */
function dueHint(sla) {
  switch (sla.state) {
    case 'pending':
    case 'warning':
      return `Vence: ${formatDueAt(sla.dueAt)}`
    case 'overdue':
      return `Venció: ${formatDueAt(sla.dueAt)}`
    case 'met':
      return `${DONE_LABEL[sla.goal]} en ${formatSlaDuration(sla.tookSeconds)}`
    default:
      return `${DONE_LABEL[sla.goal]} en ${formatSlaDuration(sla.tookSeconds)}; vencía: ${formatDueAt(sla.dueAt)}`
  }
}

/**
 * SLA de un ticket en la Bandeja (plan 4y): la meta activa con su cuenta regresiva.
 * @param {{ ticket: object, now: number }} props `now` en ms (la Bandeja lo actualiza cada minuto).
 */
export function SlaBadge({ ticket, now }) {
  const sla = ticketSla(ticket, now)
  // Fechas inválidas: no hay vencimiento que mostrar.
  if (sla.state === 'unknown') {
    return (
      <span className="text-muted-foreground" data-sla-state="unknown">
        <span aria-hidden="true">{slaText(sla)}</span>
        <span className="sr-only">SLA sin datos</span>
      </span>
    )
  }
  const style = STYLES[sla.state]
  const hint = dueHint(sla)
  return (
    <Badge
      variant={style.variant}
      className={cn('whitespace-nowrap tabular-nums', style.className)}
      title={hint}
      data-sla-state={sla.state}
    >
      {sla.state === 'met' && <CheckIcon aria-hidden="true" />}
      {sla.state === 'warning' && <span className="sr-only">Por vencer: </span>}
      <span>{slaText(sla)}</span>
      <span className="sr-only">. {hint}</span>
    </Badge>
  )
}
