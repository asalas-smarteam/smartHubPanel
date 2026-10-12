import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/api/errors'

import { AuthShell } from './auth-shell'
import { loginSchema } from './schemas'
import { useLogin } from './session'

export function LoginPage() {
  const login = useLogin()
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  // Al entrar, el guard de /login redirige solo (a donde iba o al inicio).
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values)
    } catch {
      // El error se muestra con login.error.
    }
  })

  return (
    <AuthShell
      title="Panel de soporte"
      description="Entra con el correo y la contraseña que te dio Smarteam."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormAlert>{login.isError && getErrorMessage(login.error)}</FormAlert>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="login-email">Correo</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              {...form.register('email')}
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...form.register('password')}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>
        <Button type="submit" variant="brand" size="lg" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  )
}
