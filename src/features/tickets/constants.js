/** Estados del ticket (spec §2). */
export const TICKET_STATUSES = ['abierto', 'en_progreso', 'esperando_cliente', 'resuelto']

export const STATUS_LABELS = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  esperando_cliente: 'Esperando cliente',
  resuelto: 'Resuelto',
}

/** Categorías genéricas del spec. */
export const TICKET_CATEGORIES = [
  'sincronizacion',
  'documentos',
  'precios',
  'mapeos',
  'acceso',
  'otro',
]

export const CATEGORY_LABELS = {
  sincronizacion: 'Sincronización',
  documentos: 'Documentos',
  precios: 'Precios',
  mapeos: 'Mapeos',
  acceso: 'Acceso',
  otro: 'Otro',
}

/** Textos del registro enlazado a un ticket, con su género gramatical. */
export const CONTEXT_TEXT = {
  webhookEvent: { linked: 'Evento enlazado', the: 'el evento', that: 'ese evento' },
  syncLog: { linked: 'Sync enlazada', the: 'la sync', that: 'esa sync' },
}

/** Categoría sugerida al reportar un problema desde Eventos o Syncs (editable). */
export const CONTEXT_SUGGESTED_CATEGORY = { webhookEvent: 'documentos', syncLog: 'sincronizacion' }

/** Contexto en la URL de "Nuevo ticket" (`?contexto=evento&id=…`) → contextType de la API. */
export const CONTEXT_FROM_QUERY = { evento: 'webhookEvent', sync: 'syncLog' }

export const TITLE_MAX = 150
export const TEXT_MAX = 5000

/**
 * Acciones de Smarteam disponibles por estado (solo transiciones del spec).
 * Responder en `abierto` lo pasa a `en_progreso` (lo hace el servidor).
 */
export const STAFF_ACTIONS = {
  abierto: { reply: true, waitForClient: false, resolve: true, rework: false },
  en_progreso: { reply: true, waitForClient: true, resolve: true, rework: false },
  esperando_cliente: { reply: true, waitForClient: false, resolve: true, rework: false },
  resuelto: { reply: false, waitForClient: false, resolve: false, rework: true },
}
