import { Badge } from '@/components/ui/badge'

import { EVENT_STATUS_LABELS, EVENT_STATUS_VARIANT, UNKNOWN_STATUS_LABEL } from './constants'

export function EventStatusBadge({ status }) {
  return (
    <Badge
      variant={EVENT_STATUS_VARIANT[status] ?? 'muted'}
      className="whitespace-normal text-left"
    >
      {EVENT_STATUS_LABELS[status] ?? status ?? UNKNOWN_STATUS_LABEL}
    </Badge>
  )
}
