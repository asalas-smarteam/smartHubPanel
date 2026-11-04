import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, CopyIcon, KeyRoundIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ERROR_CODES, getErrorMessage, hasErrorCode } from '@/lib/api/errors'

import { useCreateApiToken } from './api'
import { createApiTokenSchema, TOKEN_NAME_MAX, TOKEN_TTL_DAYS } from './schemas'

const DEFAULT_VALUES = { name: '', currentPassword: '' }

/** URL de la API de este panel (la misma en cualquier entorno: local, pruebas o producción). */
const panelApiUrl = () => `${window.location.origin}/api`

/** El token recién creado, UNA sola vez, con el botón Copiar y cómo configurarlo. */
function CreatedToken({ token }) {
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
    } catch {
      // Sin permiso para el portapapeles: queda seleccionado para copiarlo a mano.
      setCopied(false)
      toast.error('No se pudo copiar; selecciónalo y cópialo.')
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-api-token">Tu token</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="new-api-token"
            readOnly
            value={token}
            className="font-mono text-sm"
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <span role="status" className="sr-only">
          {copied ? 'Token copiado' : ''}
        </span>
        <p className="rounded-md bg-status-waiting-bg px-3 py-2 text-sm font-medium text-status-waiting-fg">
          Guárdalo ahora: no se vuelve a mostrar.
        </p>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">Cómo usarlo con la skill de registro de tiempo</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground">
          <li>
            Configura en tu equipo la variable de entorno{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              PANEL_TOKEN
            </code>{' '}
            con este token.
          </li>
          <li>
            La URL de la API del panel es{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs break-all text-foreground">
              {panelApiUrl()}
            </code>
            .
          </li>
        </ol>
      </div>
    </div>
  )
}

/**
 * Crear un token personal (plan 4z). Pide el nombre y la contraseña actual; al crearlo muestra el
 * token completo una sola vez. Mientras se envía no se puede cerrar, y con el token a la vista
 * solo se sale con "Ya lo guardé" (ni Escape ni clic afuera). Al cerrar se descarta todo: estado,
 * formulario y mutación (que además no queda en la caché, ver `useCreateApiToken`).
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void }} props
 */
export function CreateApiTokenDialog({ open, onOpenChange }) {
  const createToken = useCreateApiToken()
  const [created, setCreated] = useState(null) // { token, item }
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: DEFAULT_VALUES,
  })
  const { errors, isSubmitting } = form.formState
  const locked = isSubmitting || Boolean(created)

  function close() {
    form.reset(DEFAULT_VALUES)
    setFormError(null)
    setCreated(null)
    createToken.reset()
    onOpenChange(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await createToken.mutateAsync(values)
      // El token y la contraseña no quedan en la mutación ni en el formulario.
      createToken.reset()
      form.reset(DEFAULT_VALUES)
      setCreated(result)
    } catch (error) {
      createToken.reset()
      if (hasErrorCode(error, ERROR_CODES.INVALID_CURRENT_PASSWORD)) {
        form.setError('currentPassword', { message: getErrorMessage(error) })
      } else {
        setFormError(getErrorMessage(error))
      }
    }
  })

  const keepOpen = (event) => {
    if (locked) event.preventDefault()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else if (!locked) close()
      }}
    >
      <DialogContent
        showCloseButton={!locked}
        onEscapeKeyDown={keepOpen}
        onInteractOutside={keepOpen}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRoundIcon className="size-5 text-icon" aria-hidden="true" />
                Token creado
              </DialogTitle>
              <DialogDescription>
                «{created.item.name}». Vence a los {TOKEN_TTL_DAYS} días.
              </DialogDescription>
            </DialogHeader>
            <CreatedToken token={created.token} />
            <DialogFooter>
              <Button type="button" onClick={close}>
                Ya lo guardé
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo token de API</DialogTitle>
              <DialogDescription>
                Lo verás una sola vez, al crearlo. Vence a los {TOKEN_TTL_DAYS} días.
              </DialogDescription>
            </DialogHeader>
            <form
              id="create-api-token-form"
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-4"
            >
              <FormAlert>{formError}</FormAlert>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="new-api-token-name">Nombre</FieldLabel>
                  <Input
                    id="new-api-token-name"
                    autoComplete="off"
                    maxLength={TOKEN_NAME_MAX}
                    aria-invalid={Boolean(errors.name)}
                    {...form.register('name')}
                  />
                  <FieldDescription>
                    Para reconocerlo después, p. ej. «Claude en mi portátil».
                  </FieldDescription>
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={Boolean(errors.currentPassword)}>
                  <FieldLabel htmlFor="new-api-token-password">Tu contraseña actual</FieldLabel>
                  <Input
                    id="new-api-token-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.currentPassword)}
                    {...form.register('currentPassword')}
                  />
                  <FieldDescription>
                    La pedimos para confirmar que eres tú antes de crear el token.
                  </FieldDescription>
                  <FieldError errors={[errors.currentPassword]} />
                </Field>
              </FieldGroup>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" form="create-api-token-form" disabled={isSubmitting}>
                {isSubmitting ? 'Creando…' : 'Crear token'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
