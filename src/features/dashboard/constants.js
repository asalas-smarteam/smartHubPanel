// Inicio ("Estado de la integración"): períodos, grupos de causas y colores.

export const PERIOD_PARAM = 'periodo'
export const PERIOD_OPTIONS = [7, 30, 90]
export const DEFAULT_PERIOD = 30
/** Con más días que esto, la actividad se agrupa por semana. */
export const MAX_DAILY_ROWS = 31

// Grupos de causas: compartidos con Eventos (src/features/causes).
export { CAUSE_GROUPS, causeGroup } from '@/features/causes/constants'

/** Qué significa que la mayoría de los errores caiga en cada grupo (frase de resumen). */
export const GROUP_PHRASES = {
  deal_data:
    'nacen del dato que viaja en el negocio: se corrigen en el origen, no en la integración',
  fiscal_data: 'son de datos fiscales del cliente: se corrigen en su ficha',
  destination_validation: 'los rechazó una validación del sistema destino',
  master_blocked: 'son de clientes o artículos bloqueados en el sistema destino',
  connectivity: 'fueron de conectividad: suelen resolverse solos al reintentar',
  other: 'todavía no tienen una causa conocida',
}

/**
 * Métricas de tickets para el cliente ("Tu soporte" en el Inicio). Apagadas por ahora: las
 * métricas de soporte son solo para Smarteam (14-10-2026). Con `true` vuelve la tarjeta.
 */
export const CLIENT_TICKET_METRICS = false

export const STATUS_SERIES = [
  { key: 'created', label: 'Creados', color: 'var(--chart-ok)' },
  { key: 'corrected', label: 'Corregidos', color: 'var(--chart-warn)' },
  { key: 'errored', label: 'Con error', color: 'var(--chart-bad)' },
  { key: 'pending', label: 'En cola o procesando', color: 'var(--chart-wait)' },
]
