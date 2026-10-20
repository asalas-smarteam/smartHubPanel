import { AlertTriangleIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/dates'

/** "Activa" / "Inactiva". */
export function TaskStatusBadge({ active }) {
  return active ? <Badge variant="success">Activa</Badge> : <Badge variant="muted">Inactiva</Badge>
}

/** Última corrida; con aviso si la tarea guarda un error. */
export function LastRun({ task }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span>{task.lastRunAt ? formatDateTime(task.lastRunAt) : 'Nunca'}</span>
      {task.lastError && (
        <span className="inline-flex items-center gap-1 text-xs text-status-error-fg">
          <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
          Con error
        </span>
      )}
    </span>
  )
}
