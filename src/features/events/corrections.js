// "Corregido" (plan 4k-bis): un evento con error que un reintento posterior del mismo negocio y
// del mismo tipo dejó bien. Lo calcula el front con los eventos que entrega la API (que no
// conoce este estado): aquí solo las reglas, sin pedidos.

export const CORRECTED = 'corrected'
/** Estados que cuentan como "terminó bien" para corregir un error anterior. */
export const SUCCESS_STATUSES = [
  'completed',
  'destination_created',
  'destination_created_origin_error',
]

const keyOf = (event) => (event.reference ? `${event.reference}|${event.type}` : null)

/**
 * Para cada error, el primer evento posterior con la misma referencia y el mismo tipo que
 * terminó bien. Devuelve id del error → { id, at } del que lo corrigió.
 * @param {Array<{ id: string, type: string, status: string|null, reference: string|null, createdAt: string }>} errors
 * @param {Array<{ id: string, type: string, status: string|null, reference: string|null, createdAt: string }>} candidates
 */
export function matchCorrections(errors, candidates) {
  const successes = new Map()
  for (const event of candidates) {
    const key = keyOf(event)
    if (!key || !SUCCESS_STATUSES.includes(event.status)) continue
    successes.set(key, [...(successes.get(key) ?? []), event])
  }
  for (const list of successes.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const corrections = new Map()
  for (const error of errors) {
    const key = keyOf(error)
    if (error.status !== 'errored' || !key) continue
    const fix = successes.get(key)?.find((event) => event.createdAt > error.createdAt)
    if (fix) corrections.set(error.id, { id: fix.id, at: fix.createdAt })
  }
  return corrections
}

/** El evento con `status: 'corrected'` y `correctedBy` si está en `corrections`. */
export function withCorrection(event, corrections) {
  const fix = corrections.get(event.id)
  return fix ? { ...event, status: CORRECTED, correctedBy: fix } : event
}

/** Fecha local `YYYY-MM-DD` de un instante en la zona `tz`. */
export function localDay(iso, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/**
 * Resumen del Inicio (F2) con los corregidos aparte: los saca de "con error", de su día, de las
 * causas y de los grupos, y marca sus pasos en "más de un intento".
 * @param {object} summary respuesta de F2
 * @param {Array<object>} correctedErrors eventos con error (de la lista) que se corrigieron
 */
export function applyCorrectionsToSummary(summary, correctedErrors) {
  if (correctedErrors.length === 0) return summary
  const tz = summary.period.tz
  const corrected = correctedErrors.length

  const byDay = summary.byDay.map((day) => ({ ...day }))
  const days = new Map(byDay.map((day) => [day.date, day]))
  const causes = new Map(summary.causes.map((cause) => [cause.key, { ...cause }]))
  const groups = new Map(summary.groups.map((group) => [group.key, { ...group }]))
  for (const error of correctedErrors) {
    const day = days.get(localDay(error.createdAt, tz))
    if (day && day.errored > 0) {
      day.errored -= 1
      day.corrected = (day.corrected ?? 0) + 1
    }
    const cause = error.cause && causes.get(error.cause.key)
    if (cause) cause.count -= 1
    const group = error.cause && groups.get(error.cause.group)
    if (group) group.count -= 1
  }

  const fixedSteps = new Set(
    correctedErrors.map((error) => `${error.reference}|${error.createdAt}`),
  )
  const multiAttempt = {
    ...summary.multiAttempt,
    items: summary.multiAttempt.items.map((item) => ({
      ...item,
      steps: item.steps.map((step) =>
        step.status === 'errored' && fixedSteps.has(`${item.reference}|${step.at}`)
          ? { ...step, status: CORRECTED, summary: `${step.summary} (corregido)` }
          : step,
      ),
    })),
  }

  return {
    ...summary,
    totals: {
      ...summary.totals,
      corrected: (summary.totals.corrected ?? 0) + corrected,
      errored: Math.max(0, summary.totals.errored - corrected),
    },
    byDay,
    causes: [...causes.values()]
      .filter((cause) => cause.count > 0)
      .sort((a, b) => b.count - a.count || (a.key === 'other') - (b.key === 'other')),
    groups: [...groups.values()]
      .filter((group) => group.count > 0)
      .sort((a, b) => b.count - a.count),
    multiAttempt,
  }
}
