import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'

import { AttachmentGallery } from './attachment-gallery'

function Entry({ author, isStaff, date, body, attachments, urlFor, label }) {
  return (
    <article
      aria-label={label}
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4',
        isStaff ? 'border-notice-border bg-notice' : 'bg-surface',
      )}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{author}</span>
        {isStaff && <Badge variant="info">Smarteam</Badge>}
        <time className="ml-auto text-muted-foreground" dateTime={date}>
          {formatDateTime(date)}
        </time>
      </header>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      <AttachmentGallery attachments={attachments} urlFor={urlFor} />
    </article>
  )
}

/**
 * Descripción del ticket (como primer bloque) y luego los mensajes, en orden.
 * @param {{ ticket: object, urlFor: (fileId: string) => string }} props
 */
export function TicketThread({ ticket, urlFor }) {
  return (
    <section aria-label="Conversación" className="flex flex-col gap-3">
      <Entry
        label="Descripción del ticket"
        author={ticket.createdBy.name}
        isStaff={false}
        date={ticket.openedAt}
        body={ticket.description}
        attachments={ticket.attachments}
        urlFor={urlFor}
      />
      {ticket.messages.map((message) => (
        <Entry
          key={message.id}
          label={`Mensaje de ${message.authorName}`}
          author={message.authorName}
          isStaff={message.authorType !== 'cliente'}
          date={message.createdAt}
          body={message.body}
          attachments={message.attachments}
          urlFor={urlFor}
        />
      ))}
    </section>
  )
}
