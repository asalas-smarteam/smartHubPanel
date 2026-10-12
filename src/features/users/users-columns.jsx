import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/dates'

import { ACCOUNT_TYPE_LABELS, ROLE_LABELS } from './schemas'
import { UserRowActions } from './user-row-actions'

/**
 * Columnas de la tabla de usuarios (TanStack Table v9).
 * @param {{ currentEmail?: string, onAction: (action: string, user: object) => void }} options
 */
export function buildUserColumns({ currentEmail, onAction }) {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    { id: 'email', accessorKey: 'email', header: 'Correo' },
    {
      id: 'accountType',
      accessorKey: 'accountType',
      header: 'Tipo',
      cell: ({ row }) =>
        row.original.accountType === 'smarteam' ? (
          <Badge variant="outline">{ACCOUNT_TYPE_LABELS.smarteam}</Badge>
        ) : (
          ACCOUNT_TYPE_LABELS.cliente
        ),
    },
    {
      id: 'company',
      accessorKey: 'companyName',
      header: 'Empresa',
      cell: ({ row }) => row.original.companyName ?? '—',
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: 'Rol',
      cell: ({ row }) => (row.original.role ? ROLE_LABELS[row.original.role] : '—'),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const { active, mustChangePassword } = row.original
        return (
          <div className="flex flex-wrap gap-1">
            {active ? (
              <Badge variant="success">Activo</Badge>
            ) : (
              <Badge variant="muted">Inactivo</Badge>
            )}
            {active && mustChangePassword && (
              <Badge variant="warning">Debe cambiar contraseña</Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'lastLoginAt',
      accessorKey: 'lastLoginAt',
      header: 'Último ingreso',
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt, 'Nunca'),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <UserRowActions
            user={row.original}
            isSelf={row.original.email === currentEmail}
            onAction={onAction}
          />
        </div>
      ),
    },
  ]
}
