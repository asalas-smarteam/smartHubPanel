import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ERROR_CODES, getErrorMessage, hasErrorCode } from '@/lib/api/errors'

import { AuthShell } from './auth-shell'
import { changePasswordSchema, MIN_PASSWORD_LENGTH } from './schemas'
import { refreshSession, useChangePassword, useLogout } from './session'

export function ChangePasswordPage() {
  const queryClient = useQueryClient()
  const changePassword = useChangePassword()
  const logout = useLogout()
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
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

    // El guard de esta ruta redirige según el estado nuevo de la sesión.
    try {
      const session = await refreshSession(queryClient)
      if (session.status === 'anonymous') {
        // El backend cerró la sesión al cambiar la contraseña (plan §3.2 C3).
        toast.info('Contraseña cambiada. Vuelve a entrar.')
      } else {
        toast.success('Contraseña actualizada.')
      }
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <AuthShell
      title="Elige tu contraseña"
      description="Por seguridad, antes de continuar cambia la contraseña temporal que recibiste."
    >
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
            <FieldDescription id="new-password-help">
              Al menos {MIN_PASSWORD_LENGTH} caracteres, distinta de la temporal.
            </FieldDescription>
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Cerrar sesión
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
