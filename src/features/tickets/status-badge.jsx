import { Badge } from '@/components/ui/badge'

import { CATEGORY_LABELS, STATUS_LABELS } from './constants'

const STATUS_VARIANT = {
  abierto: 'default',
  en_progreso: 'info',
  esperando_cliente: 'warning',
  resuelto: 'success',
}

export function StatusBadge({ status }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>{STATUS_LABELS[status] ?? status}</Badge>
  )
}

export function CategoryLabel({ category }) {
  return <span>{CATEGORY_LABELS[category] ?? category}</span>
}

/** Punto naranja de "respuesta nueva" (con texto para lectores de pantalla). */
export function NewsDot({ show, label = 'Respuesta nueva' }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center" title={label}>
      <span aria-hidden="true" className="size-2 rounded-full bg-brand-accent" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
