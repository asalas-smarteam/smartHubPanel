import { KeyRoundIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/dates'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'

import { AccountTabs } from './account-tabs'
import { useApiTokens, useRevokeApiToken } from './api'
import { CreateApiTokenDialog } from './create-api-token-dialog'
import { MAX_ACTIVE_TOKENS, TOKEN_EXPIRY_WARNING_DAYS, TOKEN_TTL_DAYS } from './schemas'

const DAY_MS = 24 * 3_600_000
const LIMIT_REASON_ID = 'api-token-limit-reason'

/** Días (redondeados hacia arriba) que faltan para el vencimiento. */
const daysLeft = (expiresAt, now) => Math.ceil((Date.parse(expiresAt) - now) / DAY_MS)

/** Vencimiento: en ámbar si faltan 7 días o menos (la API solo lista tokens vigentes). */
function ExpiresCell({ expiresAt, now }) {
  const left = Math.max(daysLeft(expiresAt, now), 1)
  const soon = left <= TOKEN_EXPIRY_WARNING_DAYS
  return (
    <span
      className={cn('flex flex-col', soon && 'font-medium text-status-waiting-fg')}
      data-expiring={soon ? 'true' : undefined}
    >
      <span>{formatDateTime(expiresAt)}</span>
      {soon && <span className="text-xs">{`Vence en ${left} ${left === 1 ? 'día' : 'días'}`}</span>}
    </span>
  )
}

function TokensTable({ items, now, onRevoke }) {
  return (
    <Table aria-label="Tokens de API">
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Prefijo</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead>Último uso</TableHead>
          <TableHead>Vence</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((token) => (
          <TableRow key={token.id}>
            <TableCell className="font-medium">{token.name}</TableCell>
            <TableCell>
              <span className="font-mono text-xs">{token.prefix}…</span>
            </TableCell>
            <TableCell>{formatDateTime(token.createdAt)}</TableCell>
            <TableCell>{token.lastUsedAt ? formatDateTime(token.lastUsedAt) : 'Nunca'}</TableCell>
            <TableCell>
              <ExpiresCell expiresAt={token.expiresAt} now={now} />
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Revocar ${token.name}`}
                onClick={() => onRevoke(token)}
              >
                <Trash2Icon aria-hidden="true" />
                Revocar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Tokens personales de la API (plan 4z): con uno, la skill de registro de tiempo publica en los
 * tickets el resumen y las horas a nombre de quien lo creó. Solo cuentas con staff.tickets.
 */
export function ApiTokensPage() {
  const tokens = useApiTokens()
  const revoke = useRevokeApiToken()
  const now = useNow()
  const [createOpen, setCreateOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState(null)

  const items = tokens.data?.items ?? []
  // La API lista solo los vigentes: cada uno cuenta para el límite.
  const atLimit = items.length >= MAX_ACTIVE_TOKENS

  async function runRevoke() {
    const token = toRevoke
    setToRevoke(null)
    try {
      await revoke.mutateAsync(token.id)
      toast.success(`Token «${token.name}» revocado.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  let content
  if (tokens.isPending) content = <LoadingState />
  else if (tokens.isError) content = <ErrorState error={tokens.error} onRetry={tokens.refetch} />
  else if (items.length === 0) {
    content = (
      <EmptyState title="Todavía no tienes tokens">
        Crea uno para que la skill de registro de tiempo pueda cargar tus horas.
      </EmptyState>
    )
  } else {
    content = <TokensTable items={items} now={now} onRevoke={setToRevoke} />
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <AccountTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Tokens de API</h1>
          <p className="text-sm text-muted-foreground">
            Con un token, Claude publica en los tickets el resumen del trabajo y las horas a tu
            nombre, desde la skill de registro de tiempo. Cada token vence a los {TOKEN_TTL_DAYS}{' '}
            días y se muestra una sola vez, al crearlo.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={atLimit || tokens.isPending}
            aria-describedby={atLimit ? LIMIT_REASON_ID : undefined}
          >
            <PlusIcon aria-hidden="true" />
            Crear token
          </Button>
        </div>
      </div>

      {atLimit && (
        <p
          id={LIMIT_REASON_ID}
          className="flex items-center gap-2 rounded-md bg-status-waiting-bg px-3 py-2 text-sm text-status-waiting-fg"
        >
          <KeyRoundIcon className="size-4 shrink-0" aria-hidden="true" />
          Llegaste al máximo de {MAX_ACTIVE_TOKENS} tokens activos. Revoca uno para crear otro.
        </p>
      )}

      <div className="glass overflow-hidden rounded-xl">{content}</div>

      <CreateApiTokenDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={Boolean(toRevoke)} onOpenChange={(open) => !open && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar el token «{toRevoke?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Lo que lo use (por ejemplo, la skill de registro de tiempo) dejará de poder publicar
              en los tickets. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={runRevoke}>
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
