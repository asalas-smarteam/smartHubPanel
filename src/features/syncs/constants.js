/** Estados de una corrida (contrato E6: `running` = no terminó). */
export const SYNC_STATUSES = ['completed', 'errored', 'running']

export const SYNC_STATUS_LABELS = {
  completed: 'Completada',
  errored: 'Con error',
  running: 'En curso',
}

export const SYNC_STATUS_VARIANT = { completed: 'success', errored: 'error', running: 'info' }

/** Tipos de tarea genéricos (contrato E5). */
export const TASK_TYPE_LABELS = {
  record_sync: 'Sincronización de registros',
  dropdown_options: 'Opciones de listas',
}

/** Objeto sincronizado (contrato E5, en minúsculas). */
export const OBJECT_TYPES = ['product', 'contact', 'deal', 'company', 'invoice']

export const OBJECT_TYPE_LABELS = {
  product: 'Productos',
  contact: 'Contactos',
  deal: 'Negocios',
  company: 'Empresas',
  invoice: 'Facturas',
}

export const SYNC_STATUS_OPTIONS = SYNC_STATUSES.map((value) => ({
  value,
  label: SYNC_STATUS_LABELS[value],
}))

/** Contadores en el orden en que se muestran. */
export const COUNT_LABELS = {
  processed: 'Procesados',
  sent: 'Enviados',
  updated: 'Actualizados',
  failed: 'Fallidos',
  skipped: 'Omitidos',
}

/** ¿La corrida merece "Reportar problema"? Con error o con registros fallidos. */
export const syncHasProblem = (sync) => sync.status === 'errored' || sync.counts.failed > 0
