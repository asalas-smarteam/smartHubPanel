import { ConstructionIcon } from 'lucide-react'

import { PERMISSIONS, usePermissions } from '@/features/auth/permissions'

/** Página de una sección que todavía no está lista para el cliente. */
export function UnderConstructionPage({ title, children }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="glass rounded-xl">
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <ConstructionIcon className="size-8 text-subtle-foreground" aria-hidden="true" />
          <p className="text-base font-semibold">En construcción</p>
          {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
        </div>
      </div>
    </div>
  )
}

/**
 * Muestra `children` solo a Smarteam; el cliente ve "En construcción" (plan 4t).
 * Es solo UI: la API sigue respondiendo según los permisos del usuario.
 */
export function StaffPreview({ title, description, children }) {
  const { can } = usePermissions()
  if (can(PERMISSIONS.STAFF_TICKETS)) return children
  return <UnderConstructionPage title={title}>{description}</UnderConstructionPage>
}
