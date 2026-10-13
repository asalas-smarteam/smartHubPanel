import { SendIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/api/errors'

import { TEXT_MAX } from './constants'
import { ImagePicker } from './image-picker'
import { useImageAttachments } from './use-image-attachments'

/**
 * Caja para escribir un mensaje con imágenes (botón o Ctrl+V).
 * `onSubmit({ body, images })` debe lanzar si falla; si termina bien, la caja se limpia.
 */
export function MessageComposer({
  label = 'Tu respuesta',
  placeholder = 'Escribe tu mensaje…',
  submitLabel = 'Enviar',
  onSubmit,
}) {
  const id = useId()
  const attachments = useImageAttachments()
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError(null)
    const text = body.trim()
    if (!text) return setFieldError('Escribe un mensaje.')
    if (text.length > TEXT_MAX) return setFieldError(`Máximo ${TEXT_MAX} caracteres.`)
    setFieldError(null)
    setSending(true)
    try {
      await onSubmit({ body: text, images: attachments.files })
      setBody('')
      attachments.clear()
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={attachments.handlePaste}
      noValidate
      className="flex flex-col gap-3"
    >
      <FormAlert>{formError}</FormAlert>
      <Field data-invalid={Boolean(fieldError)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Textarea
          id={id}
          rows={4}
          value={body}
          placeholder={placeholder}
          maxLength={TEXT_MAX}
          aria-invalid={Boolean(fieldError)}
          onChange={(event) => setBody(event.target.value)}
          disabled={sending}
        />
        <div className="flex justify-between gap-2">
          <FieldError>{fieldError}</FieldError>
          <span className="ml-auto text-xs text-muted-foreground">
            {body.length}/{TEXT_MAX}
          </span>
        </div>
      </Field>
      <ImagePicker attachments={attachments} disabled={sending} />
      <div className="flex justify-end">
        <Button type="submit" disabled={sending}>
          <SendIcon aria-hidden="true" />
          {sending ? 'Enviando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
