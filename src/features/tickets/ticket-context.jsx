import { ArrowRightIcon, LinkIcon } from 'lucide-react'
import { Link } from 'react-router'

import { CopyableId } from '@/components/copyable-id'
import { PERMISSIONS, usePermissions } from '@/features/auth/permissions'
import { CauseLabel } from '@/features/causes/cause-label'
import { EVENT_STATUS_LABELS, eventTypeLabel } from '@/features/events/constants'
import { TENANT_PARAM } from '@/features/scope/use-scope'
import { MISSING_TASK_LABEL, SYNC_STATUS_LABELS } from '@/features/syncs/constants'

import { CONTEXT_TEXT } from './constants'

// El snapshot es JSON libre (lo guardado al crear el ticket): solo se muestran los campos con la
// forma esperada. La causa (G5) puede faltar en tickets viejos.
const isCause = (value) =>
  Boolean(value) && typeof value.label === 'string' && typeof value.group === 'string'
const text = (value) => (typeof value === 'string' && value.trim() ? value : null)

/** Título, estado y error del registro enlazado, sacados del snapshot. */
function summarize(type, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null
  if (type === 'syncLog') {
    const failed = Number(snapshot.counts?.failed) || 0
    const message = snapshot.errorMessage
    return {
      title: text(snapshot.task?.name) ?? MISSING_TASK_LABEL,
      status: [
        SYNC_STATUS_LABELS[snapshot.status] ?? text(snapshot.status),
        failed > 0 ? `${failed} ${failed === 1 ? 'fallido' : 'fallidos'}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      error: text(message) ?? text(message?.summary),
    }
  }
  return {
    title: text(snapshot.type) ? eventTypeLabel(snapshot.type) : null,
    status: EVENT_STATUS_LABELS[snapshot.status] ?? text(snapshot.status),
    error: text(snapshot.lastError),
  }
}

/** Ruta al detalle del registro; en la Bandeja lleva la empresa (`?empresa=`). */
function detailPath(type, refId, tenantKey) {
  const base = type === 'syncLog' ? '/syncs' : '/eventos'
  const search = tenantKey ? `?${new URLSearchParams({ [TENANT_PARAM]: tenantKey })}` : ''
  return `${base}/${encodeURIComponent(refId)}${search}`
}

/**
 * Evento o sync enlazado al ticket: id copiable, resumen del momento en que se creó el ticket
 * (`snapshot`) y enlace al detalle, donde está el registro completo (plan 4h).
 * @param {{ context: object, tenantKey?: string }} props `tenantKey`: solo en la Bandeja.
 */
export function TicketContext({ context, tenantKey }) {
  const { can } = usePermissions()
  if (!context) return null
  const labels = CONTEXT_TEXT[context.type] ?? { linked: 'Registro enlazado', the: 'el registro' }
  const summary = summarize(context.type, context.snapshot)
  const canOpen =
    context.type === 'syncLog' ? can(PERMISSIONS.SYNCS_READ) : can(PERMISSIONS.EVENTS_READ)
  const known = context.type === 'syncLog' || context.type === 'webhookEvent'

  return (
    <section aria-label="Contexto enlazado" className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <LinkIcon className="size-4 text-icon" aria-hidden="true" />
          {labels.linked}
          <CopyableId id={context.refId} className="font-normal text-muted-foreground" />
        </p>
        {known && canOpen && context.refId && (
          <Link
            to={detailPath(context.type, context.refId, tenantKey)}
            className="inline-flex items-center gap-1 font-semibold text-link underline-offset-4 hover:underline"
          >
            {context.type === 'syncLog' ? 'Ver sync' : 'Ver evento'}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {summary && (summary.title || summary.status) && (
        <p className="pl-6">
          {summary.title && <span className="font-semibold">{summary.title}</span>}
          {summary.title && summary.status && ' · '}
          {summary.status}
        </p>
      )}
      {isCause(context.snapshot?.cause) && (
        <p className="pl-6 text-muted-foreground">
          Causa: <CauseLabel cause={context.snapshot.cause} withGroup />
        </p>
      )}
      {summary?.error && (
        <p className="line-clamp-3 pl-6 whitespace-pre-wrap text-status-error-fg">
          {summary.error}
        </p>
      )}
    </section>
  )
}
