import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTenants } from '@/features/tenants/api'
import { ERROR_CODES, getErrorMessage, hasErrorCode } from '@/lib/api/errors'

import { useCreateUser } from './api'
import { createUserSchema } from './schemas'

const DEFAULT_VALUES = { accountType: 'cliente', email: '', name: '', tenantKey: '', role: '' }

/**
 * Alta de usuario. Al crear llama a `onCreated({ user, temporaryPassword })` y se cierra.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, onCreated: (result: object) => void }} props
 */
export function CreateUserDialog({ open, onOpenChange, onCreated }) {
  const createUser = useCreateUser()
  const tenants = useTenants()
  const [formError, setFormError] = useState(null)
  const form = useForm({ resolver: zodResolver(createUserSchema), defaultValues: DEFAULT_VALUES })
  const { errors, isSubmitting } = form.formState
  const accountType = useWatch({ control: form.control, name: 'accountType' })

  function close() {
    form.reset(DEFAULT_VALUES)
    setFormError(null)
    onOpenChange(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await createUser.mutateAsync(values)
      close()
      // El resultado (con la temporal) se entrega una vez y no se guarda en la mutación.
      createUser.reset()
      onCreated(result)
    } catch (error) {
      if (hasErrorCode(error, ERROR_CODES.EMAIL_TAKEN)) {
        form.setError('email', { message: getErrorMessage(error) })
      } else {
        setFormError(getErrorMessage(error))
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Se genera una contraseña temporal que verás una sola vez.
          </DialogDescription>
        </DialogHeader>

        <form id="create-user-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert>{formError}</FormAlert>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.accountType)}>
              <FieldLabel htmlFor="new-user-type">Tipo de cuenta</FieldLabel>
              <Controller
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="new-user-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="smarteam">Smarteam</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="new-user-email">Correo</FieldLabel>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                aria-invalid={Boolean(errors.email)}
                {...form.register('email')}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="new-user-name">Nombre</FieldLabel>
              <Input
                id="new-user-name"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                {...form.register('name')}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            {accountType === 'cliente' && (
              <>
                <Field data-invalid={Boolean(errors.tenantKey)}>
                  <FieldLabel htmlFor="new-user-tenant">Empresa</FieldLabel>
                  <Controller
                    control={form.control}
                    name="tenantKey"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="new-user-tenant"
                          className="w-full"
                          aria-invalid={Boolean(errors.tenantKey)}
                        >
                          <SelectValue
                            placeholder={tenants.isPending ? 'Cargando…' : 'Elige la empresa'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(tenants.data ?? []).map((tenant) => (
                            <SelectItem key={tenant.tenantKey} value={tenant.tenantKey}>
                              {tenant.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.tenantKey]} />
                </Field>

                <Field data-invalid={Boolean(errors.role)}>
                  <FieldLabel htmlFor="new-user-role">Rol</FieldLabel>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="new-user-role"
                          className="w-full"
                          aria-invalid={Boolean(errors.role)}
                        >
                          <SelectValue placeholder="Elige el rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="usuario">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.role]} />
                </Field>
              </>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="create-user-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
