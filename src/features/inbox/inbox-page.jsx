import { AlertTriangleIcon } from 'lucide-react'
import { use, useState } from 'react'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { FilterSelect } from '@/components/filter-select'
import { useTenants } from '@/features/tenants/api'
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/features/tickets/options'
import { CategoryLabel, NewsDot, StatusBadge } from '@/features/tickets/status-badge'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { TICKET_CATEGORIES, TICKET_STATUSES } from '@/features/tickets/constants'
import { pickOption, usePaginationParams } from '@/lib/pagination'
import { useNow } from '@/lib/use-now'

import { useInboxSummary, useInboxTickets } from './api'
import { InboxSummary } from './inbox-summary'
import { ticketSla } from './sla'
import { SlaBadge } from './sla-badge'
import { SlaNowContext } from './sla-now-context'

const getRowId = (ticket) => `${ticket.tenantKey}:${ticket.id}`

const RelativeDate = ({ value, empty }) =>
  value ? (
    <time dateTime={value} title={formatDateTime(value)}>
      {formatRelative(value)}
    </time>
  ) : (
    <span className="text-muted-foreground">{empty}</span>
  )

/**
 * SLA de la fila con la hora de la Bandeja (se actualiza cada minuto). Fuera del proveedor usa
 * la hora en que se montó la celda, para que los vencimientos se sigan viendo.
 */
function SlaCell({ ticket }) {
  const [mountedAt] = useState(() => Date.now())
  return <SlaBadge ticket={ticket} now={use(SlaNowContext) ?? mountedAt} />
}

// Estables a nivel de módulo (TanStack Table v9).
const columns = [
  {
    id: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
        <NewsDot show={row.original.hasNews} label="Mensaje nuevo del cliente" />
        {row.original.code}
      </span>
    ),
  },
  {
    id: 'company',
    header: 'Empresa',
    meta: { cellClassName: 'whitespace-normal' },
    cell: ({ row }) => row.original.companyName ?? row.original.tenantKey,
  },
  {
    id: 'title',
    header: 'Título',
    meta: { cellClassName: 'min-w-44 whitespace-normal' },
    cell: ({ row }) => (
      <Link
        to={`/bandeja/${row.original.tenantKey}/${row.original.id}`}
        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'category',
    header: 'Categoría',
    cell: ({ row }) => <CategoryLabel category={row.original.category} />,
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'sla',
    header: 'SLA',
    cell: ({ row }) => <SlaCell ticket={row.original} />,
  },
  {
    id: 'createdBy',
    header: 'Abierto por',
    meta: { cellClassName: 'whitespace-normal' },
    cell: ({ row }) => row.original.createdBy.name,
  },
  {
    id: 'lastActivityAt',
    header: 'Última actividad',
    cell: ({ row }) => <RelativeDate value={row.original.lastActivityAt} />,
  },
  {
    id: 'firstResponseAt',
    header: 'Primera respuesta',
    cell: ({ row }) => <RelativeDate value={row.original.firstResponseAt} empty="Sin respuesta" />,
  },
]

function Warnings({ warnings, tenants }) {
  if (!warnings?.length) return null
  const names = warnings.map(
    (warning) =>
      tenants?.find((tenant) => tenant.tenantKey === warning.tenantKey)?.companyName ??
      warning.tenantKey,
  )
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-status-waiting-fg/30 bg-status-waiting-bg px-4 py-3 text-sm text-status-waiting-fg"
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        No se pudieron cargar los tickets de: <strong>{names.join(', ')}</strong>. El resto de la
        bandeja está al día.
      </p>
    </div>
  )
}

/** Toda la fila abre el ticket (plan 4k). */
const ticketHref = (ticket) => `/bandeja/${ticket.tenantKey}/${ticket.id}`

// Fila con el SLA vencido: borde izquierdo rojo (en la primera celda: el box-shadow de un <tr>
// no se dibuja igual en todos los navegadores) y fondo rojo muy tenue.
const OVERDUE_ROW =
  'bg-status-error-bg/40 hover:bg-status-error-bg/70 [&>td:first-child]:shadow-[inset_3px_0_0_var(--status-error-fg)]'

/** Bandeja de Smarteam: todos los tickets de todos los tenants (S5). */
export function InboxPage() {
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  // Solo valores conocidos: el backend responde 400 a los demás.
  const status = pickOption(getFilter('status'), TICKET_STATUSES)
  const tenantKey = getFilter('tenantKey')
  const category = pickOption(getFilter('category'), TICKET_CATEGORIES)

  const tickets = useInboxTickets({ page, pageSize, status, tenantKey, category })
  const now = useNow()
  const slaState = (ticket) => ticketSla(ticket, now).state
  const summary = useInboxSummary()
  const tenants = useTenants()
  const tenantOptions = (tenants.data ?? []).map((tenant) => ({
    value: tenant.tenantKey,
    label: tenant.companyName,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bandeja</h1>
        <p className="text-sm text-muted-foreground">
          Tickets de todas las empresas, primero los de actividad más reciente.
        </p>
      </div>

      <InboxSummary
        summary={summary.data}
        activeStatus={status}
        onSelect={(value) => setFilter('status', value)}
      />

      <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
        <FilterSelect
          id="inbox-status-filter"
          label="Estado"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setFilter('status', value)}
        />
        <FilterSelect
          id="inbox-tenant-filter"
          label="Empresa"
          allLabel="Todas"
          value={tenantKey}
          options={tenantOptions}
          onChange={(value) => setFilter('tenantKey', value)}
        />
        <FilterSelect
          id="inbox-category-filter"
          label="Categoría"
          allLabel="Todas"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(value) => setFilter('category', value)}
        />
      </div>

      <Warnings warnings={tickets.data?.warnings} tenants={tenants.data} />

      <SlaNowContext value={now}>
        <DataTable
          rowHref={ticketHref}
          rowClassName={(ticket) => (slaState(ticket) === 'overdue' ? OVERDUE_ROW : undefined)}
          rowAttributes={(ticket) => ({ 'data-sla': slaState(ticket) })}
          label="Bandeja"
          columns={columns}
          data={tickets.data}
          page={page}
          pageSize={pageSize}
          onPaginationChange={setPagination}
          isPending={tickets.isPending}
          isFetching={tickets.isFetching}
          error={tickets.error}
          onRetry={tickets.refetch}
          getRowId={getRowId}
          emptyTitle="No hay tickets con estos filtros"
        />
      </SlaNowContext>
    </div>
  )
}
