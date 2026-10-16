import { cn } from '@/lib/utils'

import { causeGroup } from './constants'

/**
 * Causa de un error (G3): punto con el color de su grupo y la etiqueta. Con `withGroup`,
 * agrega el nombre del grupo.
 * @param {{ cause: { key: string, label: string, group: string }, withGroup?: boolean, className?: string }} props
 */
export function CauseLabel({ cause, withGroup = false, className }) {
  const group = causeGroup(cause.group)
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: group.color }}
      />
      <span className="font-medium text-foreground">{cause.label}</span>
      {withGroup && <span className="text-muted-foreground">· {group.label}</span>}
    </span>
  )
}
