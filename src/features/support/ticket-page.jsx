import { CheckCircle2Icon, ClockIcon, RotateCcwIcon } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'

import { ErrorState, LoadingState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Can } from '@/features/auth/can'
import { PERMISSIONS } from '@/features/auth/permissions'
import { MessageComposer } from '@/features/tickets/message-composer'
import { TicketContext } from '@/features/tickets/ticket-context'
import { TicketHeader } from '@/features/tickets/ticket-header'
import { TicketThread } from '@/features/tickets/ticket-thread'

import { supportAttachmentUrl, useReopenTicket, useReplyTicket, useSupportTicket } from './api'
import { ReopenDialog } from './reopen-dialog'

function Notice({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-brand-blue-pale bg-brand-paper-tint px-3 py-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-royal" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

/** Detalle del ticket para el cliente. Nunca muestra la resolución interna. */
export function TicketPage() {
  const { id } = useParams()
  const ticket = useSupportTicket(id)
  const reply = useReplyTicket(id)
  const reopen = useReopenTicket(id)
  const [reopenOpen, setReopenOpen] = useState(false)

  if (ticket.isPending) return <LoadingState />
  if (ticket.isError) {
    return (
      <div className="glass rounded-xl">
        <ErrorState
          error={ticket.error}
          onRetry={ticket.error?.status === 404 ? undefined : ticket.refetch}
          title={ticket.error?.status === 404 ? 'Ticket no encontrado' : undefined}
        />
      </div>
    )
  }

  const data = ticket.data
  const urlFor = (fileId) => supportAttachmentUrl(data.id, fileId)
  const resolved = data.status === 'resuelto'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <TicketHeader ticket={data} backTo="/soporte" backLabel="Volver a Soporte" />

      {data.context && (
        <Card className="gap-0 py-4">
          <CardContent>
            <TicketContext context={data.context} />
          </CardContent>
        </Card>
      )}

      <TicketThread ticket={data} urlFor={urlFor} />

      {resolved ? (
        <Card className="gap-4 py-5">
          <CardContent className="flex flex-col gap-3">
            <Notice icon={CheckCircle2Icon}>
              Smarteam marcó este ticket como resuelto. Si el problema sigue, avísanos y lo
              reabrimos.
            </Notice>
            <Can permission={PERMISSIONS.TICKETS_REOPEN}>
              <div>
                <Button variant="brand" onClick={() => setReopenOpen(true)}>
                  <RotateCcwIcon aria-hidden="true" />
                  Sigue fallando
                </Button>
              </div>
            </Can>
          </CardContent>
        </Card>
      ) : (
        <Can permission={PERMISSIONS.TICKETS_REPLY}>
          <Card className="gap-4 py-5">
            <CardContent className="flex flex-col gap-3">
              {data.status === 'esperando_cliente' && (
                <Notice icon={ClockIcon}>Smarteam espera tu respuesta para seguir.</Notice>
              )}
              <MessageComposer
                onSubmit={async (values) => {
                  await reply.mutateAsync(values)
                  toast.success('Mensaje enviado.')
                }}
              />
            </CardContent>
          </Card>
        </Can>
      )}

      <ReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        onConfirm={async (message) => {
          await reopen.mutateAsync({ message })
          toast.success('Reabrimos el ticket. Smarteam lo revisará de nuevo.')
        }}
      />
    </div>
  )
}
