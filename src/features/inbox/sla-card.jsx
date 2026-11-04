import { TimerIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'

import { formatSlaDuration, ticketSlaGoals } from './sla'
import { formatDueDay, SLA_GOALS_NOTE } from './sla-format'

const TONE = {
  pending: 'text-foreground',
  warning: 'font-medium text-status-waiting-fg',
  overdue: 'font-medium text-status-error-fg',
  met: 'text-status-done-fg',
  missed: 'text-muted-foreground',
  unknown: 'text-muted-foreground',
}

/**
 * Texto de una meta: "vence hoy 10:30 · en 1 h 20", "cumplida en 1 h 05", etc. Las horas van en
 * hora de Costa Rica; "—" si la fecha de apertura no es válida.
 */
function goalText(goal, now) {
  switch (goal.state) {
    case 'pending':
    case 'warning':
      return `vence ${formatDueDay(goal.dueAt, now)} · en ${formatSlaDuration(goal.remainingSeconds)}`
    case 'overdue':
      return `venció ${formatDueDay(goal.dueAt, now)} · hace ${formatSlaDuration(goal.overdueSeconds)}`
    case 'met':
      return `cumplida en ${formatSlaDuration(goal.tookSeconds)}`
    case 'unknown':
      return '—'
    default:
      return `fuera de plazo: ${formatSlaDuration(goal.tookSeconds)}`
  }
}

function GoalRow({ label, goal, now }) {
  return (
    <div className="flex flex-col gap-0.5" data-sla-state={goal.state}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm tabular-nums', TONE[goal.state])}>{goalText(goal, now)}</dd>
    </div>
  )
}

/** SLA del ticket en el detalle de Smarteam (plan 4y): primera respuesta y resolución. */
export function SlaCard({ ticket }) {
  const now = useNow()
  const goals = ticketSlaGoals(ticket, now)
  return (
    <Card className="gap-3 py-4" role="region" aria-label="SLA">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <TimerIcon className="size-4 text-icon" aria-hidden="true" />
          SLA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <dl className="flex flex-col gap-2">
          <GoalRow label="Primera respuesta" goal={goals.firstResponse} now={now} />
          <GoalRow label="Resolución" goal={goals.resolution} now={now} />
        </dl>
        <p className="text-xs text-muted-foreground">{SLA_GOALS_NOTE}</p>
      </CardContent>
    </Card>
  )
}
