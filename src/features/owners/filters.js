import { formatNumber } from '@/lib/format'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

const hasCode = (value) => value !== null && value !== undefined && value !== ''

/** Activos primero; después por nombre en el CRM (o correo si no tiene nombre). */
export function sortOwners(items) {
  return [...items].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      collator.compare(
        a.crmOwnerName ?? a.crmOwnerEmail ?? '',
        b.crmOwnerName ?? b.crmOwnerEmail ?? '',
      ),
  )
}

/**
 * Responsables que pasan los filtros (en el navegador: la API los manda todos).
 * La búsqueda mira nombre, correo e IDs del CRM y del ERP.
 * @param {object[]} items
 * @param {{ estado?: string, q?: string }} filters
 */
export function filterOwners(items, { estado, q }) {
  const search = q?.trim().toLocaleLowerCase('es')
  return items.filter(
    (item) =>
      (estado !== 'activos' || item.active) &&
      (estado !== 'inactivos' || !item.active) &&
      (!search ||
        [
          item.crmOwnerName,
          item.crmOwnerEmail,
          item.crmOwnerId,
          item.erpOwnerName,
          item.erpOwnerId,
          item.erpEmployeeId,
        ].some(
          (field) => hasCode(field) && String(field).toLocaleLowerCase('es').includes(search),
        )),
  )
}

/** Totales del resumen: "sin vendedor" cuenta los activos que no tienen vendedor en el ERP. */
export function summarizeOwners(items) {
  return {
    total: items.length,
    active: items.filter((item) => item.active).length,
    withoutSeller: items.filter((item) => item.active && !hasCode(item.erpOwnerId)).length,
  }
}

const plural = (count, one, many) => `${formatNumber(count)} ${count === 1 ? one : many}`

/** Texto del aviso después de sincronizar con el CRM (O3). */
export function syncMessage({ added, updated }) {
  const refreshed = `se actualizaron los datos de ${plural(updated, 'responsable', 'responsables')}`
  if (added > 0) {
    const text = `Se ${added === 1 ? 'agregó' : 'agregaron'} ${plural(added, 'responsable nuevo', 'responsables nuevos')}`
    return updated > 0 ? `${text} y ${refreshed}.` : `${text}.`
  }
  if (updated > 0) return `No hay responsables nuevos; ${refreshed}.`
  return 'No hay responsables nuevos en el CRM.'
}

export { hasCode }
