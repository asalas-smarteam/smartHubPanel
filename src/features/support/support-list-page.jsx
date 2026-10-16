import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { FilterSelect } from '@/components/filter-select'
import { Button } from '@/components/ui/button'
import { Can } from '@/features/auth/can'
import { PERMISSIONS } from '@/features/auth/permissions'
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/features/tickets/options'
import { CategoryLabel, NewsDot, StatusBadge } from '@/features/tickets/status-badge'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { TICKET_CATEGORIES, TICKET_STATUSES } from '@/features/tickets/constants'
import { pickOption, usePaginationParams } from '@/lib/pagination'

import { useSupportTickets } from './api'

const getRowId = (ticket) => ticket.id

// Estables a nivel de módulo (TanStack Table v9).
const columns = [
  {
    id: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
        <NewsDot show={row.original.hasNews} />
        {row.original.code}
      </span>
    ),
  },
  {
    id: 'title',
    header: 'Título',
    meta: { cellClassName: 'min-w-56 whitespace-normal' },
    cell: ({ row }) => (
      <Link
        to={`/soporte/${row.original.id}`}
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
  { id: 'createdBy', header: 'Abierto por', cell: ({ row }) => row.original.createdBy.name },
  {
    id: 'lastActivityAt',
    header: 'Última actividad',
    cell: ({ row }) => (
      <time
        dateTime={row.original.lastActivityAt}
        title={formatDateTime(row.original.lastActivityAt)}
      >
        {formatRelative(row.original.lastActivityAt)}
      </time>
    ),
  },
  {
    id: 'reopenCount',
    header: 'Reaperturas',
    cell: ({ row }) => (row.original.reopenCount > 0 ? row.original.reopenCount : ''),
  },
]

function NewTicketButton() {
  return (
    <Can permission={PERMISSIONS.TICKETS_CREATE}>
      <Button asChild>
        <Link to="/soporte/nuevo">
          <PlusIcon aria-hidden="true" />
          Nuevo ticket
        </Link>
      </Button>
    </Can>
  )
}

/** Toda la fila abre el ticket (plan 4k). */
const ticketHref = (ticket) => `/soporte/${ticket.id}`
export function SupportListPage() {
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  // Solo valores conocidos: el backend responde 400 a los demás.
  const status = pickOption(getFilter('status'), TICKET_STATUSES)
  const category = pickOption(getFilter('category'), TICKET_CATEGORIES)
  const tickets = useSupportTickets({ page, pageSize, status, category })
  const filtered = Boolean(status || category)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Soporte</h1>
          <p className="text-sm text-muted-foreground">
            Los tickets de tu empresa. Todos en tu equipo pueden verlos y responderlos.
          </p>
        </div>
        <NewTicketButton />
      </div>

      <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
        <FilterSelect
          id="support-status-filter"
          label="Estado"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setFilter('status', value)}
        />
        <FilterSelect
          id="support-category-filter"
          label="Categoría"
          allLabel="Todas"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(value) => setFilter('category', value)}
        />
      </div>

      <DataTable
        rowHref={ticketHref}
        label="Tickets"
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
        emptyTitle={filtered ? 'No hay tickets con estos filtros' : 'Todavía no hay tickets'}
        emptyDescription={
          filtered ? undefined : 'Cuando tengas un problema con la integración, cuéntanos aquí.'
        }
      />
    </div>
  )
}
