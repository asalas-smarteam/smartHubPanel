import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'

import { ChangePasswordForm } from './change-password-form'
import { MIN_PASSWORD_LENGTH } from './schemas'
import { refreshSession } from './session'

/**
 * Cambio voluntario de contraseña, solo cuentas de Smarteam (plan 4s). A los clientes se les
 * restablece desde Usuarios. Usa el mismo endpoint que el cambio obligatorio (C2).
 */
export function AccountPasswordPage() {
  const queryClient = useQueryClient()

  async function onChanged() {
    const session = await refreshSession(queryClient)
    if (session.status === 'anonymous') {
      toast.info('Contraseña cambiada. Vuelve a entrar.')
    } else {
      toast.success('Contraseña actualizada. Tus otras sesiones se cerraron.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cambiar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Al guardar se cierran tus sesiones abiertas en otros dispositivos; esta sigue activa.
        </p>
      </div>
      <Card className="py-6">
        <CardContent className="px-6">
          <ChangePasswordForm
            onChanged={onChanged}
            helpText={`Al menos ${MIN_PASSWORD_LENGTH} caracteres, distinta de la actual.`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
