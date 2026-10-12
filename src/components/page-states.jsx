import { AlertTriangleIcon, InboxIcon, LockIcon, Loader2Icon, SearchXIcon } from 'lucide-react'
import { Link, useRouteError } from 'react-router'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

function StateBox({ icon: Icon, title, children, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && <Icon className="size-8 text-brand-ink-soft" aria-hidden="true" />}
      <p className="text-base font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Cargando…', className }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 py-12 text-muted-foreground',
        className,
      )}
    >
      <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <LoadingState />
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'No pudimos cargar la información',
  className,
}) {
  return (
    <StateBox icon={AlertTriangleIcon} title={title} className={className}>
      <p role="alert">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onRetry()}>
          Reintentar
        </Button>
      )}
    </StateBox>
  )
}

export function EmptyState({ title = 'No hay resultados', children, className }) {
  return (
    <StateBox icon={InboxIcon} title={title} className={className}>
      {children}
    </StateBox>
  )
}

export function ForbiddenState() {
  return (
    <div className="glass rounded-xl">
      <StateBox icon={LockIcon} title="No tienes acceso a esta sección">
        Si crees que deberías tenerlo, pídeselo al equipo de Smarteam.
      </StateBox>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="glass rounded-xl">
        <StateBox icon={SearchXIcon} title="Página no encontrada">
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/">Ir al inicio</Link>
          </Button>
        </StateBox>
      </div>
    </div>
  )
}

/** Error inesperado al renderizar una ruta. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="glass rounded-xl">
        <StateBox icon={AlertTriangleIcon} title="Algo salió mal">
          <p>Recarga la página. Si el problema sigue, avisa al equipo de Smarteam.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Recargar
          </Button>
        </StateBox>
      </div>
    </div>
  )
}
