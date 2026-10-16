import { EVENT_STATUS_LABELS, eventTypeLabel } from '@/features/events/constants'
import { MISSING_TASK_LABEL, SYNC_STATUS_LABELS } from '@/features/syncs/constants'

function Line({ title, status, detail }) {
  return (
    <div className="flex flex-col gap-1 pl-6">
      <p>
        <span className="font-semibold">{title}</span> · {status}
      </p>
      {detail && <p className="line-clamp-3 whitespace-pre-wrap text-status-error-fg">{detail}</p>}
    </div>
  )
}

/** Resumen del registro que se va a enlazar (ver use-linked-record.js): tipo, estado y error. */
export function LinkedRecordSummary({ context, record }) {
  if (record.isPending) {
    return <p className="pl-6 text-muted-foreground">Cargando el resumen…</p>
  }
  if (!record.data) return null
  const data = record.data
  if (context.contextType === 'syncLog') {
    const failed = data.counts.failed
    const status = [
      SYNC_STATUS_LABELS[data.status] ?? data.status,
      failed > 0 ? `${failed} ${failed === 1 ? 'fallido' : 'fallidos'}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    const detail = typeof data.errorMessage === 'string' ? data.errorMessage : null
    return <Line title={data.task?.name ?? MISSING_TASK_LABEL} status={status} detail={detail} />
  }
  return (
    <Line
      title={eventTypeLabel(data.type)}
      status={[EVENT_STATUS_LABELS[data.status] ?? data.status, data.cause?.label]
        .filter(Boolean)
        .join(' · ')}
      detail={data.lastError}
    />
  )
}
