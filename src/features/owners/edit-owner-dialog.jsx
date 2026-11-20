import { AlertTriangleIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { ERROR_CODES, getErrorMessage } from '@/lib/api/errors'

import {
  CODE_MAX_LENGTH,
  codeToInput,
  parseEmployeeCode,
  parseSellerCodes,
  sameCode,
} from './codes'

/**
 * Editar un responsable (plan 5c): solo el vendedor y el empleado (digitador) del ERP.
 * `onSave({ erpOwnerId, erpEmployeeId })` debe lanzar si falla. Montarlo con `key={owner.id}`
 * para que cada responsable arranque con sus valores.
 */
export function EditOwnerDialog({ owner, onClose, onSave }) {
  const id = useId()
  const [seller, setSeller] = useState(() => codeToInput(owner.erpOwnerId))
  const [employee, setEmployee] = useState(() => codeToInput(owner.erpEmployeeId))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const parsedSeller = parseSellerCodes(seller)
  const parsedEmployee = parseEmployeeCode(employee)
  const unchanged =
    !parsedSeller.error &&
    !parsedEmployee.error &&
    sameCode(parsedSeller.value, owner.erpOwnerId) &&
    sameCode(parsedEmployee.value, owner.erpEmployeeId)
  const severalSellers = (parsedSeller.codes?.length ?? 0) > 1

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {
      seller: parsedSeller.error ?? null,
      employee: parsedEmployee.error ?? null,
    }
    setErrors(nextErrors)
    if (nextErrors.seller || nextErrors.employee) return

    setSaving(true)
    setFormError(null)
    try {
      await onSave({ erpOwnerId: parsedSeller.value, erpEmployeeId: parsedEmployee.value })
    } catch (error) {
      if (error?.code === ERROR_CODES.ERP_OWNER_TAKEN) {
        setErrors({ seller: getErrorMessage(error), employee: null })
      } else {
        setFormError(getErrorMessage(error))
      }
    } finally {
      setSaving(false)
    }
  }

  const who = owner.crmOwnerName ?? owner.crmOwnerEmail ?? `ID ${owner.crmOwnerId}`

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar responsable</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{who}</span>
            {owner.crmOwnerName && owner.crmOwnerEmail && <> · {owner.crmOwnerEmail}</>}
          </DialogDescription>
        </DialogHeader>
        <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormAlert>{formError}</FormAlert>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.seller)}>
              <FieldLabel htmlFor={`${id}-seller`}>Vendedor en el ERP</FieldLabel>
              <FieldDescription>
                Un código, o varios separados por coma. Vacío: sin vendedor.
              </FieldDescription>
              <Input
                id={`${id}-seller`}
                className="font-mono"
                inputMode="numeric"
                autoComplete="off"
                maxLength={CODE_MAX_LENGTH}
                value={seller}
                aria-invalid={Boolean(errors.seller)}
                onChange={(event) => setSeller(event.target.value)}
              />
              <FieldError>{errors.seller}</FieldError>
              {severalSellers && (
                <p role="status" className="text-sm text-status-waiting-fg">
                  Con varios códigos, los documentos creados desde el CRM salen sin vendedor.
                </p>
              )}
            </Field>
            <Field data-invalid={Boolean(errors.employee)}>
              <FieldLabel htmlFor={`${id}-employee`}>Empleado en el ERP (digitador)</FieldLabel>
              <FieldDescription>Un solo código. Vacío: sin empleado.</FieldDescription>
              <Input
                id={`${id}-employee`}
                className="font-mono"
                inputMode="numeric"
                autoComplete="off"
                maxLength={18}
                value={employee}
                aria-invalid={Boolean(errors.employee)}
                onChange={(event) => setEmployee(event.target.value)}
              />
              <FieldError>{errors.employee}</FieldError>
            </Field>
          </FieldGroup>
          <div
            role="note"
            className="flex items-start gap-2 rounded-lg border border-status-waiting-fg/30 bg-status-waiting-bg px-3 py-2.5 text-sm text-status-waiting-fg"
          >
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              El panel no comprueba que estos códigos existan en el ERP: verifícalos antes de
              guardar. El cambio aplica de inmediato a las próximas cotizaciones y pedidos, y un
              código equivocado los deja sin vendedor o los asigna a otra persona.
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={`${id}-form`} disabled={saving || unchanged}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
