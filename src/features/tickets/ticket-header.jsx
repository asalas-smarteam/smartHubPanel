import { ArrowLeftIcon } from 'lucide-react'
import { Link } from 'react-router'

import { formatDateTime } from '@/lib/dates'

import { CategoryLabel, StatusBadge } from './status-badge'

/** Cabecera común del detalle: volver, código, título, estado, categoría y apertura. */
export function TicketHeader({ ticket, backTo, backLabel, extra }) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        to={backTo}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold tracking-wide text-muted-foreground">
          {ticket.code}
        </span>
        <StatusBadge status={ticket.status} />
        {extra}
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
      <p className="text-sm text-muted-foreground">
        <CategoryLabel category={ticket.category} /> · Abierto por {ticket.createdBy.name} el{' '}
        {formatDateTime(ticket.openedAt)}
      </p>
    </div>
  )
}
