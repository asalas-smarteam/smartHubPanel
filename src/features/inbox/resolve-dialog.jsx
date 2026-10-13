import { useId, useState } from 'react'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { TEXT_MAX } from '@/features/tickets/constants'
import { ImagePicker } from '@/features/tickets/image-picker'
import { useImageAttachments } from '@/features/tickets/use-image-attachments'
import { getErrorMessage } from '@/lib/api/errors'

/**
 * Resolver (S10): exige el mensaje al cliente y la resolución interna.
 * `onConfirm({ message, internalResolution, images })` debe lanzar si falla.
 */
export function ResolveDialog({ open, onOpenChange, onConfirm }) {
  const id = useId()
  const attachments = useImageAttachments()
  const [values, setValues] = useState({ message: '', internalResolution: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [sending, setSending] = useState(false)

  function close() {
    setValues({ message: '', internalResolution: '' })
    setErrors({})
    setFormError(null)
    attachments.clear()
    onOpenChange(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const message = values.message.trim()
    const internalResolution = values.internalResolution.trim()
    const nextErrors = {
      message: message ? null : 'Escribe el mensaje para el cliente.',
      internalResolution: internalResolution
        ? null
        : 'Escribe cómo se resolvió (solo lo ve Smarteam).',
    }
    setErrors(nextErrors)
    if (nextErrors.message || nextErrors.internalResolution) return

    setSending(true)
    setFormError(null)
    try {
      await onConfirm({ message, internalResolution, images: attachments.files })
      close()
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const bind = (name) => ({
    value: values[name],
    maxLength: TEXT_MAX,
    'aria-invalid': Boolean(errors[name]),
    onChange: (event) => setValues((current) => ({ ...current, [name]: event.target.value })),
  })

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolver ticket</DialogTitle>
          <DialogDescription>
            El cliente ve el mensaje. La resolución interna queda solo para Smarteam y servirá para
            resolver casos parecidos.
          </DialogDescription>
        </DialogHeader>
        <form
          id={`${id}-form`}
          onSubmit={handleSubmit}
          onPaste={attachments.handlePaste}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormAlert>{formError}</FormAlert>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.message)}>
              <FieldLabel htmlFor={`${id}-message`}>Mensaje al cliente</FieldLabel>
              <Textarea id={`${id}-message`} rows={4} {...bind('message')} />
              <FieldError>{errors.message}</FieldError>
            </Field>
            <ImagePicker attachments={attachments} disabled={sending} />
            <Field data-invalid={Boolean(errors.internalResolution)}>
              <FieldLabel htmlFor={`${id}-internal`}>Resolución interna</FieldLabel>
              <FieldDescription>No la ve el cliente. Causa y qué se cambió.</FieldDescription>
              <Textarea id={`${id}-internal`} rows={4} {...bind('internalResolution')} />
              <FieldError>{errors.internalResolution}</FieldError>
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form={`${id}-form`} disabled={sending}>
            {sending ? 'Resolviendo…' : 'Resolver ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
