import { CheckCircle2Icon, ClockIcon, RotateCcwIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'

import { ErrorState, LoadingState } from '@/components/page-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STAFF_ACTIONS } from '@/features/tickets/constants'
import { MessageComposer } from '@/features/tickets/message-composer'
import { TicketContext } from '@/features/tickets/ticket-context'
import { TicketHeader } from '@/features/tickets/ticket-header'
import { TicketThread } from '@/features/tickets/ticket-thread'
import { TicketTimeline } from '@/features/tickets/ticket-timeline'
import { getErrorMessage } from '@/lib/api/errors'

import { staffAttachmentUrl, useStaffTicket, useStaffTicketActions } from './api'
import { InternalResolutionCard } from './internal-resolution-card'
import { ResolveDialog } from './resolve-dialog'

/** Detalle de un ticket para Smarteam (S6 a S12). */
export function StaffTicketPage() {
  const { tenantKey, id } = useParams()
  const ticket = useStaffTicket(tenantKey, id)
  const { reply, setStatus, resolve, updateInternalResolution } = useStaffTicketActions(
    tenantKey,
    id,
  )
  const [resolveOpen, setResolveOpen] = useState(false)

  // Abrir un ticket "abierto" lo pasa a "En progreso" (plan 4l). Una sola vez por ticket; si la
  // API lo rechaza (409), queda como estaba y responder lo sigue pasando a "En progreso".
  const startProgress = setStatus.mutate
  const autoStarted = useRef(null)
  const status = ticket.data?.status
  useEffect(() => {
    const key = `${tenantKey}/${id}`
    if (status !== 'abierto' || autoStarted.current === key) return
    autoStarted.current = key
    startProgress('en_progreso')
  }, [status, tenantKey, id, startProgress])

  if (ticket.isPending) return <LoadingState />
  if (ticket.isError) {
    const notFound = ticket.error?.status === 404
    return (
      <div className="glass rounded-xl">
        <ErrorState
          error={ticket.error}
          onRetry={notFound ? undefined : ticket.refetch}
          title={notFound ? 'Ticket no encontrado' : undefined}
        />
      </div>
    )
  }

  const data = ticket.data
  const actions = STAFF_ACTIONS[data.status]
  const urlFor = (fileId) => staffAttachmentUrl(data.tenantKey, data.id, fileId)

  async function changeStatus(to, successMessage) {
    try {
      await setStatus.mutateAsync(to)
      toast.success(successMessage)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <TicketHeader
          ticket={data}
          backTo="/bandeja"
          backLabel="Volver a la Bandeja"
          extra={<Badge variant="outline">{data.companyName ?? data.tenantKey}</Badge>}
        />

        {data.context && (
          <Card className="gap-0 py-4">
            <CardContent>
              <TicketContext context={data.context} tenantKey={data.tenantKey} />
            </CardContent>
          </Card>
        )}

        <TicketThread ticket={data} urlFor={urlFor} />

        {actions.reply && (
          <Card className="gap-4 py-5">
            <CardContent>
              <MessageComposer
                label="Responder al cliente"
                submitLabel="Responder"
                onSubmit={async (values) => {
                  await reply.mutateAsync(values)
                  toast.success('Respuesta enviada.')
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="flex flex-col gap-4" aria-label="Gestión del ticket">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-4">
            {actions.waitForClient && (
              <Button
                variant="outline"
                disabled={setStatus.isPending}
                onClick={() =>
                  changeStatus('esperando_cliente', 'El ticket quedó esperando al cliente.')
                }
              >
                <ClockIcon aria-hidden="true" />
                Esperando cliente
              </Button>
            )}
            {actions.resolve && (
              <Button onClick={() => setResolveOpen(true)}>
                <CheckCircle2Icon aria-hidden="true" />
                Resolver
              </Button>
            )}
            {actions.rework && (
              <Button
                variant="outline"
                disabled={setStatus.isPending}
                onClick={() => changeStatus('en_progreso', 'El ticket volvió a "En progreso".')}
              >
                <RotateCcwIcon aria-hidden="true" />
                Volver a trabajarlo
              </Button>
            )}
            {data.status === 'abierto' && (
              <p className="text-xs text-muted-foreground">
                Al responder, el ticket pasa a "En progreso".
              </p>
            )}
          </CardContent>
        </Card>

        <InternalResolutionCard
          resolution={data.internalResolution}
          onSave={async (text) => {
            await updateInternalResolution.mutateAsync(text)
            toast.success('Resolución interna guardada.')
          }}
        />

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Línea de tiempo</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <TicketTimeline ticket={data} />
          </CardContent>
        </Card>
      </aside>

      <ResolveDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        onConfirm={async (values) => {
          await resolve.mutateAsync(values)
          toast.success('Ticket resuelto.')
        }}
      />
    </div>
  )
}
