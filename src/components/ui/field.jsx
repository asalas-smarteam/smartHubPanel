import { useMemo } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function FieldSet({ className, ...props }) {
  return (
    <fieldset data-slot="field-set" className={cn('flex flex-col gap-6', className)} {...props} />
  )
}

function FieldLegend({ className, ...props }) {
  return (
    <legend
      data-slot="field-legend"
      className={cn('mb-3 text-base font-medium', className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn('group/field-group flex w-full flex-col gap-5', className)}
      {...props}
    />
  )
}

function Field({ className, orientation = 'vertical', ...props }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        'group/field flex w-full gap-2 data-[invalid=true]:text-destructive',
        orientation === 'vertical' && 'flex-col [&>*]:w-full',
        orientation === 'horizontal' &&
          'flex-row items-center [&>[data-slot=field-label]]:flex-auto',
        className,
      )}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }) {
  return (
    <div
      data-slot="field-content"
      className={cn('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-sm leading-normal font-normal text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldSeparator({ className, ...props }) {
  return (
    <div
      data-slot="field-separator"
      className={cn('relative -my-2 h-5 text-sm', className)}
      {...props}
    />
  )
}

/** Muestra el mensaje de error de un campo (o de una lista de errores de react-hook-form). */
function FieldError({ className, children, errors, ...props }) {
  const content = useMemo(() => {
    if (children) return children
    const messages = (errors ?? []).map((error) => error?.message).filter(Boolean)
    if (messages.length === 0) return null
    if (messages.length === 1) return messages[0]
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    )
  }, [children, errors])

  if (!content) return null

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
}
