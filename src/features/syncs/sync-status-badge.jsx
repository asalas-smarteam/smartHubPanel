import { Badge } from '@/components/ui/badge'

import { SYNC_STATUS_LABELS, SYNC_STATUS_VARIANT } from './constants'

export function SyncStatusBadge({ status }) {
  return (
    <Badge variant={SYNC_STATUS_VARIANT[status] ?? 'muted'}>
      {SYNC_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
