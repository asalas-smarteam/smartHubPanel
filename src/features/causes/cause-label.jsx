import { cn } from '@/lib/utils'

import { causeGroup } from './constants'

/**
 * Causa de un error (G3): punto con el color de su grupo y la etiqueta. Con `withGroup`,
 * agrega el nombre del grupo.
 * @param {{ cause: { key: string, label: string, group: string }, withGroup?: boolean, className?: string }} props
 */
export function CauseLabel({ cause, withGroup = false, className }) {
  const group = causeGroup(cause.group)
  // En línea (no flex): en pantallas angostas la causa y su grupo bajan de renglón como texto
  // corrido, sin partirse en dos columnas (plan 4o).
  return (
    <span className={cn('inline', className)}>
      <span
        aria-hidden="true"
        className="mr-1.5 inline-block size-2 rounded-full align-middle"
        style={{ backgroundColor: group.color }}
      />
      <span className="font-medium text-foreground">{cause.label}</span>
      {withGroup && <span className="text-muted-foreground"> · {group.label}</span>}
    </span>
  )
}
