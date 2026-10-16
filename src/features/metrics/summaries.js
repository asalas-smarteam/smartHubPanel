import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { CATEGORY_LABELS } from '@/features/tickets/constants'
import { formatNumber, formatPercent, formatSeconds } from '@/lib/format'

import { SAME_DAY_BUCKETS } from './constants'

/**
 * Semanas (F8) agrupadas por el mes de su lunes: suma resueltos y reabiertos. La mediana
 * no se puede sumar, así que por mes no hay mediana (se ve la del período en los indicadores).
 */
export function monthRows(byWeek) {
  const months = new Map()
  for (const week of byWeek) {
    const key = week.weekStart.slice(0, 7)
    const month = months.get(key) ?? {
      key,
      label: format(parseISO(`${key}-01`), 'MMM yy', { locale: es }).replace('.', ''),
      resolved: 0,
      reopened: 0,
    }
    month.resolved += week.resolved
    month.reopened += week.reopened
    months.set(key, month)
  }
  return [...months.values()]
}

/** Nota de "Resueltos" contra el período anterior: "12 más que los 90 días anteriores". */
export function comparisonNote(current, previous, phrase) {
  const difference = current - previous
  if (difference === 0) return `igual que los ${phrase} anteriores`
  const amount = formatNumber(Math.abs(difference))
  return `${amount} ${difference > 0 ? 'más' : 'menos'} que los ${phrase} anteriores`
}

/** "43 de 64 (67 %) se resolvieron en menos de un día." o null sin resueltos. */
export function bucketSentence(buckets) {
  const total = buckets.reduce((acc, bucket) => acc + bucket.count, 0)
  if (total === 0) return null
  const fast = buckets
    .filter((bucket) => SAME_DAY_BUCKETS.includes(bucket.key))
    .reduce((acc, bucket) => acc + bucket.count, 0)
  return `${formatNumber(fast)} de ${formatNumber(total)} (${formatPercent(fast, total, 0)}) se resolvieron en menos de un día.`
}

export const categoryLabel = (category) => CATEGORY_LABELS[category] ?? category

/** La categoría más lenta (mayor mediana), si hay al menos dos con mediana. */
export function categorySentence(byCategory) {
  const timed = byCategory.filter((entry) => entry.medianResolutionSeconds !== null)
  if (timed.length < 2) return null
  const slowest = timed.reduce((a, b) =>
    b.medianResolutionSeconds > a.medianResolutionSeconds ? b : a,
  )
  const label = categoryLabel(slowest.category)
  const time = formatSeconds(slowest.medianResolutionSeconds)
  return slowest === byCategory[0]
    ? `${label} es la de más volumen y la más lenta de resolver (mediana ${time}).`
    : `${label} es la más lenta de resolver (mediana ${time}).`
}
