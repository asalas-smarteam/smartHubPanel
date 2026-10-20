import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ERROR_CODES, getErrorMessage, hasErrorCode } from '@/lib/api/errors'

import { changePasswordSchema } from './schemas'
import { useChangePassword } from './session'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/**
 * Formulario de cambio de contraseña (actual, nueva y repetida). Lo usan el cambio obligatorio
 * (`/cambiar-contrasena`) y el cambio voluntario de Smarteam (`/cuenta/contrasena`, plan 4s).
 * @param {{ onChanged: () => Promise<void>, helpText: string, children?: import('react').ReactNode }} props
 *   `onChanged`: qué hacer después de guardar (si lanza, el error se muestra arriba).
 *   `children`: botones extra debajo de "Guardar contraseña".
 */
export function ChangePasswordForm({ onChanged, helpText, children }) {
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState(null)
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null)
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
    } catch (error) {
      if (hasErrorCode(error, ERROR_CODES.INVALID_CURRENT_PASSWORD)) {
        form.setError('currentPassword', { message: getErrorMessage(error) })
      } else {
        setFormError(getErrorMessage(error))
      }
      return
    }
    try {
      await onChanged()
      form.reset(EMPTY)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert>{formError}</FormAlert>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.currentPassword)}>
          <FieldLabel htmlFor="current-password">Contraseña actual</FieldLabel>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            {...form.register('currentPassword')}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>
        <Field data-invalid={Boolean(errors.newPassword)}>
          <FieldLabel htmlFor="new-password">Contraseña nueva</FieldLabel>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby="new-password-help"
            {...form.register('newPassword')}
          />
          <FieldDescription id="new-password-help">{helpText}</FieldDescription>
          <FieldError errors={[errors.newPassword]} />
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirm-password">Repite la contraseña nueva</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...form.register('confirmPassword')}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
        {children}
      </div>
    </form>
  )
}
