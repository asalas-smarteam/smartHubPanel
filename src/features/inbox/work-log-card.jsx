import { ClipboardClockIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import { formatNumber } from '@/lib/format'

/** Horas en español: "4,25 h", "0,75 h". */
const formatHours = (hours) => `${formatNumber(hours, '0', 2)} h`

function WorkLogEntry({ entry }) {
  return (
    <li className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{entry.author.name}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatHours(entry.hours)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
      {entry.crmProjectId && (
        <p className="text-xs text-muted-foreground">
          Proyecto del CRM: <span className="font-mono break-all">{entry.crmProjectId}</span>
        </p>
      )}
      {entry.internalNote && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-link">Nota interna</summary>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap">{entry.internalNote}</p>
        </details>
      )}
    </li>
  )
}

/**
 * Registro de trabajo del ticket (plan 4z, solo Smarteam): total de horas y cada carga hecha
 * desde la skill de registro de tiempo. El resumen de cada carga ya está en el hilo público.
 */
export function WorkLogCard({ workLog }) {
  const entries = workLog?.entries ?? []
  return (
    <Card className="gap-3 py-4" role="region" aria-label="Registro de trabajo">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardClockIcon className="size-4 text-icon" aria-hidden="true" />
          Registro de trabajo
        </CardTitle>
        <Badge variant="info">Solo Smarteam</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin horas registradas. Se cargan desde la skill de registro de tiempo.
          </p>
        ) : (
          <>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums">
                {formatHours(workLog.totalHours)}
              </span>
            </p>
            <ul className="flex flex-col gap-3" aria-label="Horas registradas">
              {entries.map((entry) => (
                <WorkLogEntry key={entry.id} entry={entry} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
