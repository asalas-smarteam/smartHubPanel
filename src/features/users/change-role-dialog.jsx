import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/lib/api/errors'

import { useUpdateUser } from './api'
import { changeRoleSchema, ROLE_LABELS } from './schemas'

/** Cambio de rol de un usuario de cliente. `user` null = cerrado. */
export function ChangeRoleDialog({ user, onClose }) {
  const updateUser = useUpdateUser()
  const [formError, setFormError] = useState(null)
  const form = useForm({ resolver: zodResolver(changeRoleSchema), defaultValues: { role: '' } })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (user) form.reset({ role: user.role ?? '' })
  }, [user, form])

  function close() {
    setFormError(null)
    onClose()
  }

  const onSubmit = form.handleSubmit(async ({ role }) => {
    setFormError(null)
    try {
      await updateUser.mutateAsync({ id: user.id, role })
      toast.success(`${user.name} ahora es ${ROLE_LABELS[role]}.`)
      close()
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <DialogDescription>
            {user?.name} ({user?.companyName}). El cambio rige en su siguiente acción en el panel.
          </DialogDescription>
        </DialogHeader>
        <form id="change-role-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert>{formError}</FormAlert>
          <Field data-invalid={Boolean(errors.role)}>
            <FieldLabel htmlFor="change-role">Rol</FieldLabel>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="change-role" className="w-full">
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
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" form="change-role-form" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
