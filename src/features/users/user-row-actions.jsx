import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  UserCheckIcon,
  UserCogIcon,
  UserXIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Menú de acciones de una fila. Sin acciones sobre la cuenta propia (supuesto C9).
 * @param {{ user: object, isSelf: boolean, onAction: (action: string, user: object) => void }} props
 */
export function UserRowActions({ user, isSelf, onAction }) {
  if (isSelf) return <span className="sr-only">Tu cuenta</span>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${user.name}`}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.accountType === 'cliente' && (
          <DropdownMenuItem onSelect={() => onAction('change-role', user)}>
            <UserCogIcon aria-hidden="true" />
            Cambiar rol
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onAction('reset-password', user)}>
          <KeyRoundIcon aria-hidden="true" />
          Restablecer contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.active ? (
          <DropdownMenuItem variant="destructive" onSelect={() => onAction('deactivate', user)}>
            <UserXIcon aria-hidden="true" />
            Desactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction('reactivate', user)}>
            <UserCheckIcon aria-hidden="true" />
            Reactivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
