import { MessageSquareWarningIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Can } from '@/features/auth/can'
import { PERMISSIONS } from '@/features/auth/permissions'

/**
 * "Reportar problema" (S2, S3): abre "Nuevo ticket" con el registro enlazado.
 * Solo con `tickets.create` (Smarteam no lo ve).
 * @param {{ kind: 'evento' | 'sync', id: string }} props
 */
export function ReportProblemButton({ kind, id }) {
  const search = new URLSearchParams({ contexto: kind, id })
  return (
    <Can permission={PERMISSIONS.TICKETS_CREATE}>
      <Button variant="brand" asChild>
        <Link to={`/soporte/nuevo?${search}`}>
          <MessageSquareWarningIcon aria-hidden="true" />
          Reportar problema
        </Link>
      </Button>
    </Can>
  )
}
