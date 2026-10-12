import { Navigate } from 'react-router'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { visibleNavItems } from '@/components/layout/nav'
import { usePermissions } from '@/features/auth/permissions'
import { useSession } from '@/features/auth/session'

/** Inicio: lleva a la primera sección permitida; si no hay ninguna todavía, saluda. */
export function HomePage() {
  const { data: session } = useSession()
  const { can } = usePermissions()
  const [first] = visibleNavItems(can)

  if (first) return <Navigate to={first.to} replace />

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">Hola, {session?.user?.name}</h1>
        </CardTitle>
        <CardDescription>
          Bienvenido al panel de soporte de Smarteam. Pronto vas a ver aquí tus tickets, eventos y
          sincronizaciones.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
