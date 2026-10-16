/** Estados de evento que devuelve la API, con nombres genéricos (contrato E1). */
export const EVENT_STATUSES = [
  'waiting',
  'in_process',
  'destination_created',
  'destination_created_origin_error',
  'completed',
  'errored',
  // Lo calcula el front (plan 4k-bis): error que un reintento posterior dejó bien.
  'corrected',
]

export const EVENT_STATUS_LABELS = {
  waiting: 'En cola',
  in_process: 'Procesando',
  destination_created: 'Creado en destino',
  destination_created_origin_error: 'Creado en destino con error al actualizar el origen',
  completed: 'Completado',
  errored: 'Con error',
  corrected: 'Corregido',
}

/** Estado que el backend no tradujo (`status: null`). */
export const UNKNOWN_STATUS_LABEL = 'Desconocido'

/** Variante de la insignia (src/components/ui/badge.jsx). */
export const EVENT_STATUS_VARIANT = {
  waiting: 'muted',
  in_process: 'info',
  destination_created: 'info',
  destination_created_origin_error: 'warning',
  completed: 'success',
  errored: 'error',
  corrected: 'corrected',
}

/** Estados en los que tiene sentido "Reportar problema". */
export const EVENT_PROBLEM_STATUSES = ['errored', 'destination_created_origin_error']

/** Tipos conocidos (contrato E2). Los demás se muestran con su valor tal cual. */
export const EVENT_TYPE_LABELS = {
  createDeal: 'Crear negocio',
  createQuotation: 'Crear cotización',
  updateQuotation: 'Actualizar cotización',
  updateDealStage: 'Cambiar etapa del negocio',
  // Plan 4m: tipos que el backend ya procesa. Nombres de 31 caracteres o menos (hoja de Excel).
  convertQuotationToOrder: 'Convertir cotización en pedido',
  purchaseQuotation: 'Cotización de compra',
  inventoryTransferRequest: 'Traslado de inventario',
}

export const eventTypeLabel = (type) => EVENT_TYPE_LABELS[type] ?? type

export const EVENT_STATUS_OPTIONS = EVENT_STATUSES.map((value) => ({
  value,
  label: EVENT_STATUS_LABELS[value],
}))

export const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))
