import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon, LinkIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CONTEXT_FROM_QUERY,
  CONTEXT_SUGGESTED_CATEGORY,
  CONTEXT_TEXT,
  TEXT_MAX,
  TICKET_CATEGORIES,
  TITLE_MAX,
} from '@/features/tickets/constants'
import { ImagePicker } from '@/features/tickets/image-picker'
import { LinkedRecordSummary } from '@/features/tickets/linked-record'
import { CATEGORY_OPTIONS } from '@/features/tickets/options'
import { useImageAttachments } from '@/features/tickets/use-image-attachments'
import { useLinkedRecord } from '@/features/tickets/use-linked-record'
import { ApiError, getErrorMessage } from '@/lib/api/errors'

import { useCreateTicket } from './api'

const newTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Escribe un título.')
    .max(TITLE_MAX, `Máximo ${TITLE_MAX} caracteres.`),
  category: z.enum(TICKET_CATEGORIES, { error: 'Elige una categoría.' }),
  description: z
    .string()
    .trim()
    .min(1, 'Cuéntanos qué pasó.')
    .max(TEXT_MAX, `Máximo ${TEXT_MAX} caracteres.`),
})

/** Contexto opcional desde la URL: `?contexto=evento|sync&id=…` (lo usan Eventos y Syncs). */
function useLinkedContext() {
  const [searchParams, setSearchParams] = useSearchParams()
  const contextType = CONTEXT_FROM_QUERY[searchParams.get('contexto')]
  const contextId = searchParams.get('id')
  const context = contextType && contextId ? { contextType, contextId } : null
  const clear = () => setSearchParams({}, { replace: true })
  return { context, clear }
}

export function NewTicketPage() {
  const navigate = useNavigate()
  const createTicket = useCreateTicket()
  const attachments = useImageAttachments()
  const { context, clear: clearContext } = useLinkedContext()
  const [formError, setFormError] = useState(null)
  const [rejectedOnSubmit, setRejectedOnSubmit] = useState(false)
  const record = useLinkedRecord(context)
  const contextMissing = rejectedOnSubmit || record.error?.status === 404

  const form = useForm({
    resolver: zodResolver(newTicketSchema),
    // Desde "Reportar problema" la categoría viene sugerida (Documentos o Sincronización).
    defaultValues: {
      title: '',
      category: context ? CONTEXT_SUGGESTED_CATEGORY[context.contextType] : '',
      description: '',
    },
  })
  const { errors, isSubmitting } = form.formState
  const [title, description] = useWatch({ control: form.control, name: ['title', 'description'] })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    setRejectedOnSubmit(false)
    try {
      const created = await createTicket.mutateAsync({
        ...values,
        ...(context ?? {}),
        images: attachments.files,
      })
      toast.success(`Ticket ${created.code} creado.`)
      navigate(`/soporte/${created.id}`, { replace: true })
    } catch (error) {
      if (context && error instanceof ApiError && error.status === 404) {
        setRejectedOnSubmit(true)
        return
      }
      setFormError(getErrorMessage(error))
    }
  })

  const contextText = context ? CONTEXT_TEXT[context.contextType] : null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/soporte"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Volver a Soporte
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo ticket</h1>
        <p className="text-sm text-muted-foreground">
          Cuéntanos qué pasó. Si tienes capturas, pégalas con Ctrl+V o adjúntalas.
        </p>
      </div>

      <Card>
        <CardContent>
          <form
            onSubmit={onSubmit}
            onPaste={attachments.handlePaste}
            noValidate
            className="flex flex-col gap-5"
          >
            <FormAlert>{formError}</FormAlert>

            {context && (
              <div className="flex flex-col gap-2 rounded-md border border-brand-blue-pale bg-brand-paper-tint px-3 py-2 text-sm">
                <p className="flex items-center gap-2">
                  <LinkIcon className="size-4 text-brand-royal" aria-hidden="true" />
                  Se enlazará {contextText.the}{' '}
                  <span className="font-mono text-xs">{context.contextId}</span>
                </p>
                {!contextMissing && <LinkedRecordSummary context={context} record={record} />}
                {contextMissing && (
                  <div role="alert" className="flex flex-wrap items-center gap-2 text-destructive">
                    No encontramos {contextText.that} en tu empresa.
                    <Button type="button" size="sm" variant="outline" onClick={clearContext}>
                      Crear sin enlazarlo
                    </Button>
                  </div>
                )}
              </div>
            )}

            <FieldGroup>
              <Field data-invalid={Boolean(errors.title)}>
                <FieldLabel htmlFor="ticket-title">Título</FieldLabel>
                <Input
                  id="ticket-title"
                  maxLength={TITLE_MAX}
                  aria-invalid={Boolean(errors.title)}
                  {...form.register('title')}
                />
                <div className="flex justify-between gap-2">
                  <FieldError errors={[errors.title]} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {title.length}/{TITLE_MAX}
                  </span>
                </div>
              </Field>

              <Field data-invalid={Boolean(errors.category)}>
                <FieldLabel htmlFor="ticket-category">Categoría</FieldLabel>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="ticket-category"
                        className="w-full sm:w-72"
                        aria-invalid={Boolean(errors.category)}
                      >
                        <SelectValue placeholder="Elige una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.category]} />
              </Field>

              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="ticket-description">Descripción</FieldLabel>
                <Textarea
                  id="ticket-description"
                  rows={6}
                  maxLength={TEXT_MAX}
                  aria-invalid={Boolean(errors.description)}
                  placeholder="Qué hiciste, qué esperabas y qué pasó."
                  {...form.register('description')}
                />
                <div className="flex justify-between gap-2">
                  <FieldError errors={[errors.description]} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {description.length}/{TEXT_MAX}
                  </span>
                </div>
              </Field>
            </FieldGroup>

            <ImagePicker attachments={attachments} disabled={isSubmitting} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/soporte">Cancelar</Link>
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting}>
                {isSubmitting ? 'Creando…' : 'Crear ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
