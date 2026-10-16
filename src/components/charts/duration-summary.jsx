import { useId } from 'react'

import { StatTile } from '@/components/charts/stat-tile'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMilliseconds, formatNumber } from '@/lib/format'

const countText = (count, noun) => `${formatNumber(count)} ${count === 1 ? noun.one : noun.other}`

// En el celular (2 columnas) el tiempo va más chico para que "14 min 06 s" quepa en una línea.
const valueClass = 'whitespace-nowrap text-[22px] sm:text-[32px]'

const gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

/**
 * Duración promedio (plan 4l y 4n): una tarjeta por grupo (tarea o tipo) con su tiempo y cuántos
 * registros lo forman, más "Promedio general" resaltada al principio.
 * @param {{
 *   query: { data?: { groups: Array<{ key: string, label: string, count: number, averageMs: number }>,
 *     overall: { count: number, averageMs: number | null }, capped: boolean },
 *     isPending: boolean, isFetching: boolean, isError: boolean, refetch: () => void },
 *   title: string, description: string, cappedNote: string,
 *   noun: { one: string, other: string }, unavailable?: string | null, empty: string,
 * }} props
 *   `unavailable`: el filtro no tiene nada terminado que medir (no se pidió nada).
 */
export function DurationSummary({
  query,
  title,
  description,
  cappedNote,
  noun,
  unavailable,
  empty,
}) {
  const titleId = useId()
  const data = unavailable ? undefined : query.data
  const loading = !unavailable && query.isPending
  const failed = !unavailable && !data && query.isError
  const overall = data?.overall
  const note = data?.capped ? `${description} ${cappedNote}` : description

  let overallNote = unavailable ? 'Nada que medir con este filtro.' : ''
  if (loading) overallNote = 'Calculando…'
  else if (failed) overallNote = 'No se pudo calcular.'
  else if (overall) overallNote = overall.count ? countText(overall.count, noun) : empty

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={!unavailable && query.isFetching ? 'true' : undefined}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={titleId}
          className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
        >
          {title}
        </h2>
        <p className="text-[13px] text-subtle-foreground">{unavailable ?? note}</p>
      </div>

      <ul aria-label={title} className={gridClass}>
        <li className="flex">
          <StatTile
            highlight
            className="flex-1"
            valueClassName={valueClass}
            label="Promedio general"
            value={loading ? '…' : formatMilliseconds(overall?.averageMs)}
            note={overallNote}
          />
        </li>
        {loading &&
          [0, 1, 2].map((key) => (
            <li key={key} className="flex">
              <Skeleton className="min-h-24 flex-1 rounded-[18px]" />
            </li>
          ))}
        {data?.groups.map((group) => (
          <li key={group.key} className="flex">
            <StatTile
              className="flex-1"
              valueClassName={valueClass}
              label={group.label}
              value={formatMilliseconds(group.averageMs)}
              note={countText(group.count, noun)}
            />
          </li>
        ))}
      </ul>
      {loading && <span className="sr-only">Calculando duraciones…</span>}

      {failed && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">No se pudo calcular la duración.</span>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
    </section>
  )
}
