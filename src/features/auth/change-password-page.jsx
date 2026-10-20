import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { AuthShell } from './auth-shell'
import { ChangePasswordForm } from './change-password-form'
import { MIN_PASSWORD_LENGTH } from './schemas'
import { refreshSession, useLogout } from './session'

/** Cambio obligatorio de la contraseña temporal (C2). */
export function ChangePasswordPage() {
  const queryClient = useQueryClient()
  const logout = useLogout()

  // El guard de esta ruta redirige según el estado nuevo de la sesión.
  async function onChanged() {
    const session = await refreshSession(queryClient)
    if (session.status === 'anonymous') {
      // El backend cerró la sesión al cambiar la contraseña (plan §3.2 C3).
      toast.info('Contraseña cambiada. Vuelve a entrar.')
    } else {
      toast.success('Contraseña actualizada.')
    }
  }

  return (
    <AuthShell
      title="Elige tu contraseña"
      description="Por seguridad, antes de continuar cambia la contraseña temporal que recibiste."
    >
      <ChangePasswordForm
        onChanged={onChanged}
        helpText={`Al menos ${MIN_PASSWORD_LENGTH} caracteres, distinta de la temporal.`}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Cerrar sesión
        </Button>
      </ChangePasswordForm>
    </AuthShell>
  )
}
