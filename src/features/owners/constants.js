// Mapeo de responsables (plan 5b, contrato 13): qué usuario del CRM corresponde a qué
// vendedor y empleado del ERP. Solo lectura.

export const EMPTY_VALUE = '—'

/** Origen del registro (`source`); uno desconocido se muestra tal cual. */
export const SOURCE_LABELS = {
  crm_seed: 'Carga inicial',
  manual: 'Manual',
}

export const sourceLabel = (value) => (value ? (SOURCE_LABELS[value] ?? value) : EMPTY_VALUE)

/** Filtro de estado (`?estado=`). */
export const STATUS_FILTERS = ['activos', 'inactivos']
export const STATUS_OPTIONS = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]
