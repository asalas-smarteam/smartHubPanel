// Tareas programadas del modo simulado (plan 4r), con la forma del contrato J2. Usan los mismos
// ids que las tareas de Syncs (`SEED_OPERATIONS.tasks`), así "Ver corridas" lleva a sus corridas.
import { SEED_OPERATIONS } from './seed-events'

const BASE = Date.parse('2026-10-12T18:00:00.000Z')
const hoursAgo = (hours) => new Date(BASE - hours * 3_600_000).toISOString()
const WORKWEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const schedule = (fields) => ({
  intervalMinutes: null,
  times: [],
  days: [],
  startTime: null,
  endTime: null,
  timeZone: 'America/Costa_Rica',
  ...fields,
})

// Configuración por empresa y nombre de tarea.
const CONFIG = {
  'ACME/Productos': {
    sourcePath: '/Items',
    mode: 'full',
    schedule: schedule({ times: ['07:00', '12:00', '15:00'], days: WORKWEEK }),
    batchSize: 100,
    filters: [
      {
        property: 'ItemsGroupCode',
        operator: 'in',
        value: [101, 102, 105, 106, 107, 108],
        isDefault: false,
        isDynamic: false,
        dynamicType: null,
        editable: true,
      },
    ],
    active: true,
    lastRunAt: hoursAgo(3),
    nextRunAt: hoursAgo(-2),
  },
  'ACME/Contactos': {
    sourcePath: '/BusinessPartners',
    mode: 'incremental',
    schedule: schedule({ intervalMinutes: 2, startTime: '08:00', endTime: '18:00' }),
    batchSize: 30,
    associationsEnabled: true,
    requireCrmIdUpdate: true,
    filters: [
      {
        property: 'CardType',
        operator: 'eq',
        value: 'C',
        isDefault: true,
        isDynamic: false,
        dynamicType: null,
        editable: false,
      },
      {
        property: 'UpdateDate',
        operator: 'ge',
        value: null,
        isDefault: true,
        isDynamic: true,
        dynamicType: 'datetime',
        editable: false,
      },
    ],
    orderBy: [{ property: 'UpdateDate', direction: 'desc' }],
    active: true,
    lastRunAt: hoursAgo(0.05),
    lastError: 'Tiempo de espera agotado al consultar el sistema destino.',
    nextRunAt: hoursAgo(-0.03),
  },
  'ACME/Opciones de listas': {
    sourcePath: null,
    mode: 'full',
    schedule: schedule({ intervalMinutes: 360 }),
    batchSize: 1,
    active: false,
    lastRunAt: hoursAgo(200),
  },
  'GLOBEX/Productos': {
    sourcePath: '/Items',
    mode: 'incremental',
    schedule: schedule({ intervalMinutes: 60 }),
    batchSize: 50,
    active: true,
    lastRunAt: hoursAgo(0.5),
    nextRunAt: hoursAgo(-0.5),
  },
  'GLOBEX/Empresas': {
    sourcePath: '/BusinessPartners',
    mode: 'full',
    schedule: schedule({ times: ['23:00'], days: ['monday', 'wednesday', 'friday'] }),
    batchSize: 100,
    active: false,
  },
}

function toScheduledTask(raw) {
  const config = CONFIG[`${raw.tenantKey}/${raw.clientName}`] ?? {}
  return {
    id: raw._id,
    tenantKey: raw.tenantKey,
    name: raw.clientName,
    type: raw.taskType === 'DROPDOWN_OPTIONS' ? 'dropdown_options' : 'record_sync',
    objectType: raw.objectType ? raw.objectType.toLowerCase() : null,
    sourcePath: null,
    mode: 'incremental',
    schedule: schedule({}),
    batchSize: 1,
    associationsEnabled: false,
    requireCrmIdUpdate: false,
    filters: [],
    orderBy: [],
    active: false,
    lastRunAt: null,
    lastError: null,
    nextRunAt: null,
    ...config,
  }
}

/** Initech (suspendida) también tiene su tarea, inactiva y sin programación. */
export const SEED_SCHEDULED_TASKS = SEED_OPERATIONS.tasks.map(toScheduledTask)
