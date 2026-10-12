import { AlertCircleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Error general de un formulario (lo que no corresponde a un campo). */
export function FormAlert({ children, className }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive',
        className,
      )}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
