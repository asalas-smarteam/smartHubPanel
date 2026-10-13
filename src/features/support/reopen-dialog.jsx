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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { TEXT_MAX } from '@/features/tickets/constants'
import { getErrorMessage } from '@/lib/api/errors'

/** "Sigue fallando": reabre un ticket resuelto con un mensaje obligatorio. */
export function ReopenDialog({ open, onOpenChange, onConfirm }) {
  const id = useId()
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [sending, setSending] = useState(false)

  function close() {
    setMessage('')
    setFieldError(null)
    setFormError(null)
    onOpenChange(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const text = message.trim()
    if (!text) return setFieldError('Cuéntanos qué sigue fallando.')
    setFieldError(null)
    setSending(true)
    try {
      await onConfirm(text)
      close()
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sigue fallando</DialogTitle>
          <DialogDescription>
            El ticket vuelve a quedar abierto y Smarteam lo revisa de nuevo.
          </DialogDescription>
        </DialogHeader>
        <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <FormAlert>{formError}</FormAlert>
          <Field data-invalid={Boolean(fieldError)}>
            <FieldLabel htmlFor={id}>¿Qué está pasando?</FieldLabel>
            <Textarea
              id={id}
              rows={4}
              maxLength={TEXT_MAX}
              value={message}
              aria-invalid={Boolean(fieldError)}
              onChange={(event) => setMessage(event.target.value)}
            />
            <FieldError>{fieldError}</FieldError>
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form={`${id}-form`} variant="brand" disabled={sending}>
            {sending ? 'Enviando…' : 'Reabrir ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
