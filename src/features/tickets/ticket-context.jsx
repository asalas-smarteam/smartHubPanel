import { LinkIcon } from 'lucide-react'

import { JsonViewer } from '@/components/json-viewer'

import { CONTEXT_TEXT } from './constants'

/** Evento o sync enlazado al ticket, con el resumen copiado al crearlo (`snapshot`). */
export function TicketContext({ context }) {
  if (!context) return null
  const text = CONTEXT_TEXT[context.type] ?? { linked: 'Registro enlazado', the: 'el registro' }
  return (
    <section aria-label="Contexto enlazado" className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <LinkIcon className="size-4 text-brand-royal" aria-hidden="true" />
        {text.linked}
        <span className="font-mono text-xs font-normal text-muted-foreground">{context.refId}</span>
      </p>
      <JsonViewer data={context.snapshot} label={`Resumen: ${text.linked.toLowerCase()}`} />
    </section>
  )
}
