// Exportar Eventos a Excel (plan 4j): mismos filtros que la pantalla, una hoja por tipo de
// evento y lo recibido / enviado / respondido de cada uno, como el Excel que se les manda a los
// clientes.

import { format, parseISO } from 'date-fns'

import { apiFetch } from '@/lib/api/client'
import { CELL_LIMIT } from '@/lib/xlsx/workbook'

import { EVENT_STATUS_LABELS, eventTypeLabel, UNKNOWN_STATUS_LABEL } from './constants'
import { collectEventsWithCorrections } from './corrections-api'
import { eventDetailSchema, staffEventDetailSchema } from './schemas'

/** Cuántos eventos (los más recientes del filtro) entran en un reporte. */
export const EXPORT_LIMIT = 500
const CONCURRENCY = 4
export const TRUNCATED_NOTE = '… [recortado: ver el evento en el panel]'

export const REPORT_COLUMNS = [
  { header: '#', width: 5 },
  { header: 'Tipo de evento', width: 16 },
  { header: 'Estado', width: 12 },
  { header: 'Error / Motivo', width: 34 },
  { header: 'Fecha de proceso', width: 20 },
  { header: 'Recibido del CRM', width: 60 },
  { header: 'Enviado al ERP', width: 60 },
  { header: 'Respuesta del ERP', width: 60 },
  { header: 'Id', width: 28 },
]

/** Texto apto para un nombre de archivo: sin caracteres que Windows no admite. */
const fileNamePart = (text) =>
  String(text ?? '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const fileName = (date, parts) =>
  `${[format(date, 'yyyy-MM-dd HH-mm-ss'), ...parts.map(fileNamePart)].filter(Boolean).join(' ')}.xlsx`

/** "2026-10-14 16-01-05 Printer Events report.xlsx" (hora local; Windows no admite ":"). */
export function reportFileName(date, companyName) {
  return fileName(date, [companyName, 'Events report'])
}

/** "2026-10-21 12-30-05 Printer Event 64467708954.xlsx": un solo evento (plan 4u). */
export function eventFileName(date, companyName, event) {
  return fileName(date, [companyName, 'Event', event.reference || event.id])
}

/** JSON compacto para una celda; si no entra en Excel, se corta con aviso. */
export function jsonCell(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (text.length <= CELL_LIMIT) return text
  return text.slice(0, CELL_LIMIT - TRUNCATED_NOTE.length) + TRUNCATED_NOTE
}

const processedAt = (event) => {
  const iso = event.updatedAt ?? event.createdAt
  return iso ? format(parseISO(iso), 'yyyy-MM-dd HH:mm:ss') : ''
}

/**
 * Hojas del reporte: una por tipo de evento, en el orden en que aparece cada tipo; dentro, los
 * eventos en el orden de la lista. `#` numera el reporte completo.
 * @param {Array<object>} events eventos de la lista, cada uno con su `exchange` (o null)
 */
export function reportSheets(events) {
  const sheets = new Map()
  events.forEach((event, index) => {
    const label = eventTypeLabel(event.type) ?? 'Otros'
    if (!sheets.has(label)) sheets.set(label, { name: label, columns: REPORT_COLUMNS, rows: [] })
    const exchange = event.exchange ?? {}
    sheets
      .get(label)
      .rows.push([
        index + 1,
        label,
        EVENT_STATUS_LABELS[event.status] ?? UNKNOWN_STATUS_LABEL,
        event.lastError ?? '',
        processedAt(event),
        jsonCell(exchange.received),
        jsonCell(exchange.sent),
        jsonCell(exchange.response),
        event.id,
      ])
  })
  return [...sheets.values()]
}

/** Corre `task` sobre cada ítem con a lo sumo `limit` a la vez, respetando el orden. */
async function mapLimited(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/**
 * Junta los eventos del filtro (hasta EXPORT_LIMIT) con su detalle, con los corregidos marcados.
 * @param {{ apiBase: string, picksTenant: boolean }} scope
 * @param {{ status?: string, type?: string, reference?: string, desde?: string, hasta?: string }} filters
 * @param {{ signal?: AbortSignal, onProgress?: (done: number, total: number) => void }} [options]
 * @returns {Promise<{ events: object[], total: number }>}
 */
export async function collectEvents(scope, filters, { signal, onProgress } = {}) {
  const { items, total } = await collectEventsWithCorrections(scope, filters, {
    limit: EXPORT_LIMIT,
    signal,
  })
  const schema = scope.picksTenant ? staffEventDetailSchema : eventDetailSchema
  let done = 0
  onProgress?.(0, items.length)
  const events = await mapLimited(items, CONCURRENCY, async (item) => {
    const detail = await apiFetch(`${scope.apiBase}/events/${encodeURIComponent(item.id)}`, {
      signal,
      schema,
    })
    done += 1
    onProgress?.(done, items.length)
    return { ...item, exchange: detail.exchange ?? null }
  })
  return { events, total }
}
