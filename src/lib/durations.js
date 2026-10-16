// Duración promedio de corridas y eventos, calculada en el front (plan 4l).

const toMs = (value) => (value ? new Date(value).getTime() : Number.NaN)

/**
 * Promedio de `end − start` por grupo y en total. Solo cuentan los registros con las dos
 * fechas y una duración válida (no negativa).
 * @template T
 * @param {T[]} items
 * @param {{ start: (item: T) => string | null | undefined, end: (item: T) => string | null | undefined,
 *   group: (item: T) => { key: string, label: string } }} accessors
 * @returns {{ groups: Array<{ key: string, label: string, count: number, averageMs: number }>,
 *   overall: { count: number, averageMs: number | null } }}
 *   Grupos de mayor a menor promedio; el total pondera por cantidad.
 */
export function averageDurations(items, { start, end, group }) {
  const groups = new Map()
  let count = 0
  let sum = 0
  for (const item of items) {
    const ms = toMs(end(item)) - toMs(start(item))
    if (!Number.isFinite(ms) || ms < 0) continue
    const { key, label } = group(item)
    const entry = groups.get(key) ?? { key, label, count: 0, sum: 0 }
    entry.count += 1
    entry.sum += ms
    groups.set(key, entry)
    count += 1
    sum += ms
  }
  return {
    groups: [...groups.values()]
      .map(({ key, label, count: n, sum: total }) => ({
        key,
        label,
        count: n,
        averageMs: total / n,
      }))
      .sort((a, b) => b.averageMs - a.averageMs || a.label.localeCompare(b.label, 'es')),
    overall: { count, averageMs: count ? sum / count : null },
  }
}
