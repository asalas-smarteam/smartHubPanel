import { ArrowLeftIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { CopyableId } from '@/components/copyable-id'
import { DetailItem } from '@/components/detail-item'
import { DetailSection } from '@/components/detail-section'
import { JsonViewer } from '@/components/json-viewer'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Card, CardContent } from '@/components/ui/card'
import { PERMISSIONS, usePermissions } from '@/features/auth/permissions'
import { CauseLabel } from '@/features/causes/cause-label'
import { TenantGate } from '@/features/scope/tenant-picker'
import { useCompanyName } from '@/features/scope/use-company-name'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { ReportProblemButton } from '@/features/tickets/report-problem-button'
import { formatDateTime } from '@/lib/dates'

import { useEvent } from './api'
import { EVENT_PROBLEM_STATUSES, eventTypeLabel } from './constants'
import { EventStatusBadge } from './event-status-badge'

const EXCHANGE_PARTS = [
  { key: 'received', title: 'Recibido del CRM' },
  { key: 'sent', title: 'Enviado al ERP' },
  { key: 'response', title: 'Respuesta del ERP' },
]

/**
 * Lo recibido, lo enviado y la respuesta (plan 4i): tres columnas en pantallas grandes y una
 * debajo de otra en las demás. Cada parte con su visor JSON y scroll propio.
 */
function Exchange({ exchange }) {
  return (
    <section aria-labelledby="exchange-title" className="flex flex-col gap-3">
      <h2 id="exchange-title" className="text-lg font-semibold">
        Intercambio
      </h2>
      <div className="grid gap-4 xl:grid-cols-3">
        {EXCHANGE_PARTS.map(({ key, title }) => {
          const value = exchange[key]
          return (
            <DetailSection key={key} title={title}>
              {value === null || value === undefined ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <JsonViewer data={value} label={title} className="max-h-[36rem]" expandAll />
              )}
            </DetailSection>
          )
        })}
      </div>
    </section>
  )
}

/** Detalle de un evento (E1). Intercambio para todos; auditoría cruda solo con `staff.events.raw`. */
export function EventPage() {
  const { id } = useParams()
  const scope = useScope()
  const companyName = useCompanyName(scope)
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
  // El objeto del evento tal cual lo da la API; payload y auditoría van en sus propias tarjetas.
  // Mientras el backend no mande `exchange`, lo recibido sale del payload (solo Smarteam).
  const exchange = data.exchange ?? (data.payload !== undefined ? { received: data.payload } : null)

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          {back}
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={data.status} />
            {scope.picksTenant && (
              <span className="text-sm text-muted-foreground">Empresa {companyName ?? '…'}</span>
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
                {/* Nombre legible y, debajo, el código interno para buscarlo en la base (plan 4o). */}
                <span className="flex flex-col gap-0.5">
                  <span>{eventTypeLabel(data.type)}</span>
                  {eventTypeLabel(data.type) !== data.type && (
                    <span className="font-mono text-xs text-muted-foreground">{data.type}</span>
                  )}
                </span>
              </DetailItem>
              <DetailItem label="Creado">{formatDateTime(data.createdAt)}</DetailItem>
              <DetailItem label="Actualizado">{formatDateTime(data.updatedAt)}</DetailItem>
              <DetailItem label="Id">
                <CopyableId id={data.id} />
              </DetailItem>
            </dl>
          </CardContent>
        </Card>

        {data.lastError && (
          <DetailSection title="Último error">
            {data.cause && (
              <p role="group" aria-label="Causa" className="mb-2 text-sm text-muted-foreground">
                Causa: <CauseLabel cause={data.cause} withGroup />
              </p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-status-error-fg">
              {data.lastError}
            </p>
            {data.correctedBy && (
              <p role="note" className="mt-3 text-sm text-muted-foreground">
                Se corrigió en un reintento el {formatDateTime(data.correctedBy.at)}.{' '}
                <Link
                  to={`/eventos/${encodeURIComponent(data.correctedBy.id)}${scopeSearch(scope)}`}
                  className="font-semibold text-link underline-offset-4 hover:underline"
                >
                  Ver el evento que lo corrigió
                </Link>
              </p>
            )}
          </DetailSection>
        )}
      </div>

      {exchange && <Exchange exchange={exchange} />}

      {showRaw && (
        <div className="mx-auto w-full max-w-4xl">
          <DetailSection title="Auditoría completa">
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Llamadas al ERP, respuesta del CRM y demás registros de la auditoría
              </summary>
              <JsonViewer data={data.audit} label="Auditoría del evento" className="mt-3" />
            </details>
          </DetailSection>
        </div>
      )}
    </div>
  )
}
