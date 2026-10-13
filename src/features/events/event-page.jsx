import { ArrowLeftIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { DetailItem } from '@/components/detail-item'
import { DetailSection } from '@/components/detail-section'
import { JsonViewer } from '@/components/json-viewer'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Card, CardContent } from '@/components/ui/card'
import { PERMISSIONS, usePermissions } from '@/features/auth/permissions'
import { TenantGate } from '@/features/scope/tenant-picker'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { ReportProblemButton } from '@/features/tickets/report-problem-button'
import { formatDateTime } from '@/lib/dates'

import { useEvent } from './api'
import { EVENT_PROBLEM_STATUSES, eventTypeLabel } from './constants'
import { EventStatusBadge } from './event-status-badge'

/** Detalle de un evento (E1). Payload y auditoría solo con `staff.events.raw` (E3). */
export function EventPage() {
  const { id } = useParams()
  const scope = useScope()
  const { can } = usePermissions()
  const event = useEvent(scope, id)
  const backTo = `/eventos${scopeSearch(scope)}`

  const back = (
    <Link
      to={backTo}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Volver a Eventos
    </Link>
  )

  if (scope.picksTenant && !scope.ready) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <TenantGate scope={scope} what="este evento" />
      </div>
    )
  }
  if (event.isPending) return <LoadingState />
  if (event.isError) {
    const notFound = event.error?.status === 404
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="glass rounded-xl">
          <ErrorState
            error={event.error}
            onRetry={notFound ? undefined : event.refetch}
            title={notFound ? 'No encontramos lo que buscas' : undefined}
          />
        </div>
      </div>
    )
  }

  const data = event.data
  const showRaw = can(PERMISSIONS.STAFF_EVENTS_RAW) && data.payload !== undefined

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={data.status} />
          {scope.picksTenant && (
            <span className="text-sm text-muted-foreground">Empresa {scope.tenantKey}</span>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{eventTypeLabel(data.type)}</h1>
          {EVENT_PROBLEM_STATUSES.includes(data.status) && (
            <ReportProblemButton kind="evento" id={data.id} />
          )}
        </div>
      </div>

      <Card className="py-4">
        <CardContent className="px-4">
          <dl className="grid gap-4 sm:grid-cols-3">
            <DetailItem label="Referencia">
              <span className="font-mono text-xs">{data.reference ?? '—'}</span>
            </DetailItem>
            <DetailItem label="Reintentos">
              {data.retries} de {data.maxRetries}
            </DetailItem>
            <DetailItem label="Tipo">
              <span className="font-mono text-xs">{data.type}</span>
            </DetailItem>
            <DetailItem label="Creado">{formatDateTime(data.createdAt)}</DetailItem>
            <DetailItem label="Actualizado">{formatDateTime(data.updatedAt)}</DetailItem>
            <DetailItem label="Id">
              <span className="font-mono text-xs break-all">{data.id}</span>
            </DetailItem>
          </dl>
        </CardContent>
      </Card>

      {data.lastError && (
        <DetailSection title="Último error">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-status-error-fg">
            {data.lastError}
          </p>
        </DetailSection>
      )}

      {showRaw && (
        <>
          <DetailSection title="Payload">
            <JsonViewer data={data.payload} label="Payload del evento" />
          </DetailSection>
          <DetailSection title="Auditoría">
            <JsonViewer data={data.audit} label="Auditoría del evento" />
          </DetailSection>
        </>
      )}
    </div>
  )
}
