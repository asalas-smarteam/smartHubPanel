import { contextLabel, objectLabel } from './constants'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

/** Orden estable: objeto, contexto y campo del ERP (por nombre en español). */
export function sortMappings(items) {
  return [...items].sort(
    (a, b) =>
      collator.compare(objectLabel(a.objectType), objectLabel(b.objectType)) ||
      collator.compare(contextLabel(a.sourceContext), contextLabel(b.sourceContext)) ||
      collator.compare(a.sourceField ?? '', b.sourceField ?? ''),
  )
}

/**
 * Mapeos que pasan los filtros de la página (todo en el navegador: la API los manda todos).
 * @param {object[]} items
 * @param {{ objeto?: string, contexto?: string, estado?: string, q?: string }} filters
 */
export function filterMappings(items, { objeto, contexto, estado, q }) {
  const search = q?.trim().toLocaleLowerCase('es')
  return items.filter(
    (item) =>
      (!objeto || item.objectType === objeto) &&
      (!contexto || item.sourceContext === contexto) &&
      (estado !== 'activos' || item.isActive) &&
      (estado !== 'inactivos' || !item.isActive) &&
      (!search ||
        [item.sourceField, item.targetField].some((field) =>
          field?.toLocaleLowerCase('es').includes(search),
        )),
  )
}

/** Opciones de un filtro con los valores que hay en los datos, ordenadas por nombre. */
export function optionsFrom(items, field, label) {
  const values = [...new Set(items.map((item) => item[field]).filter(Boolean))]
  return values
    .map((value) => ({ value, label: label(value) }))
    .sort((a, b) => collator.compare(a.label, b.label))
}

/** Totales del resumen. */
export function summarize(items) {
  return {
    total: items.length,
    active: items.filter((item) => item.isActive).length,
    inactive: items.filter((item) => !item.isActive).length,
    editable: items.filter((item) => item.editable).length,
  }
}
