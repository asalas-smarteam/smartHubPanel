import { DYNAMIC_TYPE_LABELS, EMPTY_VALUE } from './constants'

/** Valor de un filtro en texto: listas separadas por comas, objetos en JSON compacto. */
export function filterValueText(value) {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE
  if (Array.isArray(value)) return value.map((item) => filterValueText(item)).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** "No", "Sí · Fecha y hora" o "Sí" si no se sabe el tipo. */
export function dynamicText(filter) {
  if (!filter.isDynamic) return 'No'
  const type = filter.dynamicType && (DYNAMIC_TYPE_LABELS[filter.dynamicType] ?? filter.dynamicType)
  return type ? `Sí · ${type}` : 'Sí'
}
