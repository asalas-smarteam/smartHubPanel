import { PlusIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table/data-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Can } from '@/features/auth/can'
import { PERMISSIONS } from '@/features/auth/permissions'
import { useSession } from '@/features/auth/session'
import { useTenants } from '@/features/tenants/api'
import { getErrorMessage } from '@/lib/api/errors'
import { usePaginationParams } from '@/lib/pagination'

import { useResetPassword, useUpdateUser, useUsers } from './api'
import { ChangeRoleDialog } from './change-role-dialog'
import { CreateUserDialog } from './create-user-dialog'
import { TemporaryPasswordDialog } from './temporary-password-dialog'
import { buildUserColumns } from './users-columns'

const ALL_TENANTS = '__all'
const getRowId = (user) => user.id

const CONFIRMATIONS = {
  deactivate: {
    title: (user) => `¿Desactivar a ${user.name}?`,
    description:
      'Su sesión dejará de funcionar de inmediato y no podrá entrar hasta que lo reactives.',
    action: 'Desactivar',
    variant: 'destructive',
  },
  'reset-password': {
    title: (user) => `¿Restablecer la contraseña de ${user.name}?`,
    description:
      'Se genera una contraseña temporal nueva y su sesión abierta se cierra. Al entrar se le pedirá cambiarla.',
    action: 'Restablecer',
    variant: 'default',
  },
}

export function UsersPage() {
  const { data: session } = useSession()
  const { page, pageSize, setPagination, setFilter, getFilter } = usePaginationParams()
  const tenantKey = getFilter('tenantKey')

  const users = useUsers({ page, pageSize, tenantKey })
  const tenants = useTenants()
  const updateUser = useUpdateUser()
  const resetPassword = useResetPassword()

  const [createOpen, setCreateOpen] = useState(false)
  const [roleUser, setRoleUser] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type, user }
  const [temporary, setTemporary] = useState(null) // { name, email, password }

  const handleAction = useCallback(
    async (action, user) => {
      if (action === 'change-role') return setRoleUser(user)
      if (action === 'reactivate') {
        try {
          await updateUser.mutateAsync({ id: user.id, active: true })
          toast.success(`${user.name} fue reactivado.`)
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
        return
      }
      setConfirm({ type: action, user })
    },
    [updateUser],
  )

  async function runConfirmed() {
    const { type, user } = confirm
    setConfirm(null)
    try {
      if (type === 'deactivate') {
        await updateUser.mutateAsync({ id: user.id, active: false })
        toast.success(`${user.name} fue desactivado.`)
      } else {
        const result = await resetPassword.mutateAsync(user.id)
        resetPassword.reset()
        setTemporary({ name: user.name, email: user.email, password: result.temporaryPassword })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const columns = useMemo(
    () => buildUserColumns({ currentEmail: session?.user?.email, onAction: handleAction }),
    [session?.user?.email, handleAction],
  )

  const confirmation = confirm ? CONFIRMATIONS[confirm.type] : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas del panel de Smarteam y de las empresas cliente.
          </p>
        </div>
        <Can permission={PERMISSIONS.STAFF_USERS}>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon aria-hidden="true" />
            Nuevo usuario
          </Button>
        </Can>
      </div>

      <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
        <Label htmlFor="users-tenant-filter">Empresa</Label>
        <Select
          value={tenantKey || ALL_TENANTS}
          onValueChange={(value) => setFilter('tenantKey', value === ALL_TENANTS ? null : value)}
        >
          <SelectTrigger id="users-tenant-filter" className="min-w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TENANTS}>Todas</SelectItem>
            {(tenants.data ?? []).map((tenant) => (
              <SelectItem key={tenant.tenantKey} value={tenant.tenantKey}>
                {tenant.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        label="Usuarios"
        columns={columns}
        data={users.data}
        page={page}
        pageSize={pageSize}
        onPaginationChange={setPagination}
        isPending={users.isPending}
        isFetching={users.isFetching}
        error={users.error}
        onRetry={users.refetch}
        emptyTitle="No hay usuarios"
        emptyDescription={tenantKey ? 'Esta empresa todavía no tiene usuarios.' : undefined}
        getRowId={getRowId}
      />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={({ user, temporaryPassword }) => {
          toast.success(`Usuario ${user.email} creado.`)
          setTemporary({ name: user.name, email: user.email, password: temporaryPassword })
        }}
      />

      <ChangeRoleDialog user={roleUser} onClose={() => setRoleUser(null)} />

      <TemporaryPasswordDialog data={temporary} onClose={() => setTemporary(null)} />

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm && confirmation.title(confirm.user)}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant={confirmation?.variant} onClick={runConfirmed}>
              {confirmation?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
