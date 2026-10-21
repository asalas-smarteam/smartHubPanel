import { describe, expect, it } from 'vitest'

import { CELL_LIMIT } from '@/lib/xlsx/workbook'

import {
  eventFileName,
  jsonCell,
  REPORT_COLUMNS,
  reportFileName,
  reportSheets,
  TRUNCATED_NOTE,
} from './export'

const event = (id, type, extra = {}) => ({
  id,
  type,
  status: 'errored',
  lastError: 'Fallo',
  createdAt: '2026-10-14T20:00:00.000Z',
  updatedAt: '2026-10-14T22:01:05.000Z',
  exchange: { received: { a: 1 }, sent: null, response: { b: [1, 2] } },
  ...extra,
})

describe('exportar eventos', () => {
  it('nombre del archivo: fecha y hora locales con guiones, empresa y "Events report"', () => {
    expect(reportFileName(new Date(2026, 9, 14, 16, 1, 5), 'Printer')).toBe(
      '2026-10-14 16-01-05 Printer Events report.xlsx',
    )
    expect(reportFileName(new Date(2026, 0, 2, 3, 4, 5), 'A/B: C')).toBe(
      '2026-01-02 03-04-05 A B C Events report.xlsx',
    )
    expect(reportFileName(new Date(2026, 0, 2, 3, 4, 5), null)).toBe(
      '2026-01-02 03-04-05 Events report.xlsx',
    )
  })

  it('nombre del archivo de un solo evento: referencia, o el id si no tiene (plan 4u)', () => {
    const date = new Date(2026, 9, 21, 12, 30, 5)
    expect(eventFileName(date, 'Printer', { id: 'ev-1', reference: '64467708954' })).toBe(
      '2026-10-21 12-30-05 Printer Event 64467708954.xlsx',
    )
    expect(eventFileName(date, null, { id: 'ev-1', reference: null })).toBe(
      '2026-10-21 12-30-05 Event ev-1.xlsx',
    )
    expect(eventFileName(date, 'A/B', { id: 'x', reference: 'R:1' })).toBe(
      '2026-10-21 12-30-05 A B Event R 1.xlsx',
    )
  })

  it('JSON compacto; si no entra en la celda se corta con aviso', () => {
    expect(jsonCell({ a: [1, 2] })).toBe('{"a":[1,2]}')
    expect(jsonCell(null)).toBe('')
    const long = jsonCell({ x: 'y'.repeat(CELL_LIMIT) })
    expect(long).toHaveLength(CELL_LIMIT)
    expect(long.endsWith(TRUNCATED_NOTE)).toBe(true)
  })

  it('una hoja por tipo, # corrido en todo el reporte y las columnas del Excel', () => {
    const sheets = reportSheets([
      event('e1', 'createQuotation'),
      event('e2', 'createDeal', { status: 'waiting', lastError: null, exchange: null }),
      event('e3', 'createQuotation'),
    ])
    expect(sheets.map((s) => s.name)).toEqual(['Crear cotización', 'Crear negocio'])
    expect(sheets[0].columns).toBe(REPORT_COLUMNS)
    expect(REPORT_COLUMNS.map((c) => c.header)).toEqual([
      '#',
      'Tipo de evento',
      'Estado',
      'Error / Motivo',
      'Fecha de proceso',
      'Recibido del CRM',
      'Enviado al ERP',
      'Respuesta del ERP',
      'Id',
    ])
    expect(sheets[0].rows.map((row) => row[0])).toEqual([1, 3])
    const [first] = sheets[0].rows
    expect(first.slice(1, 4)).toEqual(['Crear cotización', 'Con error', 'Fallo'])
    expect(first[4]).toMatch(/^2026-10-14 \d{2}:01:05$/)
    expect(first.slice(5)).toEqual(['{"a":1}', '', '{"b":[1,2]}', 'e1'])
    expect(sheets[1].rows[0].slice(2, 8)).toEqual(['En cola', '', expect.any(String), '', '', ''])
  })
})
