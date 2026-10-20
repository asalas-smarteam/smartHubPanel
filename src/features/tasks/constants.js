// Tareas programadas (plan 4r, contrato 09). Nombres en español de los valores del backend.
import { OBJECT_TYPE_LABELS, TASK_TYPE_LABELS } from '@/features/syncs/constants'

export const EMPTY_VALUE = '—'

export const MODE_LABELS = { full: 'Completa', incremental: 'Incremental' }

/** Operadores de los filtros, en texto. Uno desconocido se muestra tal cual. */
export const OPERATOR_LABELS = {
  eq: 'igual a',
  ne: 'distinto de',
  ne_or_null: 'distinto de (o vacío)',
  ge: 'mayor o igual a',
  gt: 'mayor que',
  le: 'menor o igual a',
  lt: 'menor que',
  in: 'es uno de',
  startswith: 'empieza con',
  not_startswith: 'no empieza con',
}

export const DYNAMIC_TYPE_LABELS = { datetime: 'Fecha y hora', date: 'Fecha', time: 'Hora' }

/** Zonas horarias que el programador puede usar, con su nombre corto. */
export const TIME_ZONE_LABELS = { 'America/Costa_Rica': 'hora de Costa Rica' }

const labelOf = (labels) => (value) => (value ? (labels[value] ?? value) : EMPTY_VALUE)
export const objectLabel = labelOf(OBJECT_TYPE_LABELS)
export const taskTypeLabel = labelOf(TASK_TYPE_LABELS)
export const modeLabel = labelOf(MODE_LABELS)
export const operatorLabel = labelOf(OPERATOR_LABELS)
export const timeZoneLabel = (zone) => (zone ? (TIME_ZONE_LABELS[zone] ?? zone) : null)

/** Filtro de estado (`?estado=`). */
export const STATUS_FILTERS = ['activas', 'inactivas']
export const STATUS_OPTIONS = [
  { value: 'activas', label: 'Activas' },
  { value: 'inactivas', label: 'Inactivas' },
]
