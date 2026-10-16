import { ArrowLeftIcon } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { CopyableId } from '@/components/copyable-id'
import { DetailItem } from '@/components/detail-item'
import { DetailSection } from '@/components/detail-section'
import { JsonViewer } from '@/components/json-viewer'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Card, CardContent } from '@/components/ui/card'
import { TenantGate } from '@/features/scope/tenant-picker'
import { useCompanyName } from '@/features/scope/use-company-name'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { ReportProblemButton } from '@/features/tickets/report-problem-button'
import { formatDateTime, formatDuration } from '@/lib/dates'
import { DEFAULT_PAGE_SIZE, parsePage, parsePageSize, RESULTS_WINDOW } from '@/lib/pagination'
import { cn } from '@/lib/utils'

import { useSync } from './api'
import {
  COUNT_LABELS,
  MISSING_TASK_LABEL,
  OBJECT_TYPE_LABELS,
  syncHasProblem,
  TASK_TYPE_LABELS,
} from './constants'
import { SyncStatusBadge } from './sync-status-badge'

const numberFormat = new Intl.NumberFormat('es')

/** Página de errores en la URL (`?errorsPage=2&errorsPageSize=50`), aparte de la lista. */
function useErrorsPagination() {
  const [searchParams, setSearchParams] = useSearchParams()
  const errorsPage = parsePage(searchParams.get('errorsPage'))
  const errorsPageSize = parsePageSize(searchParams.get('errorsPageSize'))
  const setErrorsPagination = useCallback(
    ({ page, pageSize }) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          if (page > 1) params.set('errorsPage', String(page))
          else params.delete('errorsPage')
          if (pageSize !== DEFAULT_PAGE_SIZE) params.set('errorsPageSize', String(pageSize))
          else params.delete('errorsPageSize')
          return params
        },
        { preventScrollReset: true },
      )
    },
    [setSearchParams],
  )
  return { errorsPage, errorsPageSize, setErrorsPagination }
}

/** Una línea con el JSON del error (sin llaves externas) para leer la tabla de un vistazo. */
function errorPreview(value) {
  const text = JSON.stringify(value) ?? String(value)
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

// Estables a nivel de módulo (TanStack Table v9). Cada error es JSON libre (contrato E7):
// una línea de vista previa que se despliega en el visor JSON.
const errorColumns = [
  {
    id: 'detail',
    header: 'Detalle',
    meta: { cellClassName: 'whitespace-normal' },
    cell: ({ row }) => (
      <details className="group">
        <summary className="cursor-pointer font-mono text-xs break-all text-foreground marker:text-subtle-foreground">
          {errorPreview(row.original)}
        </summary>
        <JsonViewer
          data={row.original}
          label={`Error ${row.index + 1}`}
          className="mt-2 max-h-64"
          expandAll
        />
      </details>
    ),
  },
]

/** Registro del error; con `eventId` (plan 4g, opcional) enlaza al detalle del evento. */
function ErrorRecord({ item }) {
  const scope = useScope()
  const text = item.record ?? (item.eventId ? 'Ver evento' : '—')
  if (typeof item.eventId !== 'string' || !item.eventId) return text
  return (
    <Link
      to={`/eventos/${encodeURIComponent(item.eventId)}${scopeSearch(scope)}`}
      className="text-link underline-offset-4 hover:underline"
    >
      {text}
    </Link>
  )
}

// Vista de cliente (plan 5 del backend, G4): cada error llega como { record, message } y, si el
// backend lo agrega, `eventId`.
const clientErrorColumns = [
  {
    id: 'record',
    header: 'Registro',
    meta: { cellClassName: 'font-mono text-xs' },
    cell: ({ row }) => <ErrorRecord item={row.original} />,
  },
  {
    id: 'message',
    header: 'Mensaje',
    meta: { cellClassName: 'whitespace-normal' },
    cell: ({ row }) => row.original.message ?? '—',
  },
]

const CLIENT_ERROR_KEYS = ['record', 'message', 'eventId']

const isClientError = (item) =>
  item !== null &&
  typeof item === 'object' &&
  !Array.isArray(item) &&
  Object.keys(item).every((key) => CLIENT_ERROR_KEYS.includes(key))

/** `{ summary }` de la vista de cliente (G4): se muestra como texto, no como JSON. */
const isSummary = (value) =>
  value !== null &&
  typeof value === 'object' &&
  Object.keys(value).length === 1 &&
  typeof value.summary === 'string'

/**
 * Vacío de la tabla de errores. Con fallidos y sin detalle (p. ej. corridas de la cola de eventos
 * que solo guardan el resumen) no se dice "no tuvo errores": se explica que falta el detalle.
 */
function errorsEmptyState(failed) {
  if (!failed) return { emptyTitle: 'Esta corrida no tuvo errores' }
  return {
    emptyTitle: 'Sin detalle de errores',
    emptyDescription: `La corrida registró ${numberFormat.format(failed)} ${
      failed === 1 ? 'fallido' : 'fallidos'
    }, pero no guardó el detalle. Si necesitas ayuda, reporta el problema: el id de la corrida va incluido.`,
  }
}

function Counters({ counts }) {
  return (
    <div role="group" aria-label="Contadores" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Object.entries(COUNT_LABELS).map(([key, label]) => {
        const danger = key === 'failed' && counts.failed > 0
        return (
          <div key={key} className="glass flex flex-col gap-1 rounded-xl px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <strong
              className={cn('text-2xl font-bold tabular-nums', danger && 'text-status-error-fg')}
            >
              {numberFormat.format(counts[key])}
            </strong>
          </div>
        )
      })}
    </div>
  )
}

/** Detalle de una corrida (E2): contadores, omisiones, error y errores paginados. */
export function SyncPage() {
  const { id } = useParams()
  const scope = useScope()
  const companyName = useCompanyName(scope)
  const { errorsPage, errorsPageSize, setErrorsPagination } = useErrorsPagination()
  const sync = useSync(scope, id, { errorsPage, errorsPageSize })

  const back = (
    <Link
      to={`/syncs${scopeSearch(scope)}`}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Volver a Syncs
    </Link>
  )

  if (scope.picksTenant && !scope.ready) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <TenantGate scope={scope} what="esta corrida" />
      </div>
    )
  }
  if (sync.isPending) return <LoadingState />
  if (sync.isError && !sync.data) {
    const notFound = sync.error?.status === 404
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="glass rounded-xl">
          <ErrorState
            error={sync.error}
            onRetry={notFound ? undefined : sync.refetch}
            title={notFound ? 'No encontramos lo que buscas' : undefined}
          />
        </div>
      </div>
    )
  }

  const data = sync.data
  const message = data.errorMessage

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatusBadge status={data.status} />
          {scope.picksTenant && (
            <span className="text-sm text-muted-foreground">Empresa {companyName ?? '…'}</span>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data.task?.name ?? MISSING_TASK_LABEL}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[TASK_TYPE_LABELS[data.task?.type], OBJECT_TYPE_LABELS[data.objectType]]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {syncHasProblem(data) && <ReportProblemButton kind="sync" id={data.id} />}
        </div>
      </div>

      <Card className="py-4">
        <CardContent className="px-4">
          <dl className="grid gap-4 sm:grid-cols-3">
            <DetailItem label="Inicio">{formatDateTime(data.startedAt)}</DetailItem>
            <DetailItem label="Fin">{formatDateTime(data.finishedAt, 'En curso')}</DetailItem>
            <DetailItem label="Duración">
              {formatDuration(data.startedAt, data.finishedAt, '—')}
            </DetailItem>
            <DetailItem label="Id">
              <CopyableId id={data.id} />
            </DetailItem>
          </dl>
        </CardContent>
      </Card>

      <Counters counts={data.counts} />

      {data.skippedReasons.length > 0 && (
        <DetailSection title="Motivos de omisión">
          <ul className="flex flex-col gap-1 text-sm">
            {data.skippedReasons.map((entry) => (
              <li key={entry.reason} className="flex justify-between gap-4">
                <span>{entry.reason}</span>
                <span className="font-semibold tabular-nums">
                  {numberFormat.format(entry.count)}
                </span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {message !== null && message !== undefined && (
        <DetailSection title="Mensaje de error">
          {isSummary(message) ? (
            <p className="text-sm leading-relaxed text-status-error-fg">{message.summary}</p>
          ) : typeof message === 'object' ? (
            <JsonViewer data={message} label="Mensaje de error" expandAll />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-status-error-fg">
              {String(message)}
            </p>
          )}
        </DetailSection>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="sync-errors-title">
        <h2 id="sync-errors-title" className="text-lg font-semibold">
          Errores
        </h2>
        <DataTable
          label="Errores de la corrida"
          rowHref={(item) =>
            typeof item?.eventId === 'string' && item.eventId
              ? `/eventos/${encodeURIComponent(item.eventId)}${scopeSearch(scope)}`
              : undefined
          }
          columns={
            data.errors.items.length > 0 && data.errors.items.every(isClientError)
              ? clientErrorColumns
              : errorColumns
          }
          data={data.errors}
          page={errorsPage}
          pageSize={errorsPageSize}
          onPaginationChange={setErrorsPagination}
          isFetching={sync.isFetching}
          error={sync.error}
          onRetry={sync.refetch}
          {...errorsEmptyState(data.counts.failed)}
          maxResults={RESULTS_WINDOW}
          windowHint="Los demás errores no se pueden paginar desde el panel."
        />
      </section>
    </div>
  )
}
