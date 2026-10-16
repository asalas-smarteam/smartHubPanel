// Métricas de soporte (plan 4e §3.2): períodos, parámetros de la URL y rangos de resolución.

export const PERIOD_PARAM = 'periodo'
export const TENANT_FILTER_PARAM = 'empresa'
export const CATEGORY_PARAM = 'categoria'

/** Períodos: `phrase` completa "últimos …" y "los … anteriores". */
export const METRICS_PERIODS = [
  { value: 30, label: '30 días', phrase: '30 días' },
  { value: 90, label: '90 días', phrase: '90 días' },
  { value: 365, label: '12 meses', phrase: '12 meses' },
]
export const DEFAULT_METRICS_PERIOD = 90
/** Desde este largo, las columnas se agrupan por mes (F8: el backend siempre manda semanas). */
export const MONTHLY_FROM_DAYS = 365

/** Rangos de tiempo de resolución (F8), en el orden de BUCKET_KEYS. */
export const BUCKETS = {
  lt4h: { label: 'Menos de 4 h', color: 'var(--chart-ok)' },
  '4h_24h': { label: '4 a 24 h', color: 'var(--chart-1)' },
  '1d_3d': { label: '1 a 3 días', color: 'var(--chart-warn)' },
  gt3d: { label: 'Más de 3 días', color: 'var(--chart-bad)' },
}
/** Rangos que suman "en menos de un día". */
export const SAME_DAY_BUCKETS = ['lt4h', '4h_24h']

export const RESOLVED_SERIES = { label: 'Resueltos', color: 'var(--chart-1)' }
export const REOPENED_SERIES = { label: 'Reabiertos', color: 'var(--chart-2)' }
