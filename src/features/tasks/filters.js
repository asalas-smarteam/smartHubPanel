import { objectLabel, taskTypeLabel } from './constants'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

/** Activas primero y después por nombre (como el backend; se repite por si cambia). */
export function sortTasks(items) {
  return [...items].sort(
    (a, b) => Number(b.active) - Number(a.active) || collator.compare(a.name ?? '', b.name ?? ''),
  )
}

/**
 * Tareas que pasan los filtros de la página.
 * @param {{ estado?: string, objeto?: string, tipo?: string }} filters
 */
export function filterTasks(items, { estado, objeto, tipo }) {
  return items.filter(
    (task) =>
      (estado !== 'activas' || task.active) &&
      (estado !== 'inactivas' || !task.active) &&
      (!objeto || task.objectType === objeto) &&
      (!tipo || task.type === tipo),
  )
}

/** Opciones de objeto y tipo con los valores presentes. */
export function taskOptions(items) {
  const options = (field, label) =>
    [...new Set(items.map((task) => task[field]).filter(Boolean))]
      .map((value) => ({ value, label: label(value) }))
      .sort((a, b) => collator.compare(a.label, b.label))
  return { objects: options('objectType', objectLabel), types: options('type', taskTypeLabel) }
}

export function summarizeTasks(items) {
  return {
    total: items.length,
    active: items.filter((task) => task.active).length,
    inactive: items.filter((task) => !task.active).length,
    withError: items.filter((task) => task.lastError).length,
  }
}
