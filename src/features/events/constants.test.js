import { describe, expect, it } from 'vitest'

import { EVENT_TYPE_LABELS, EVENT_TYPE_OPTIONS, eventTypeLabel } from './constants'

describe('nombres de tipos de evento (plan 4m)', () => {
  it('traduce los tipos que procesa el backend', () => {
    expect(eventTypeLabel('purchaseQuotation')).toBe('Cotización de compra')
    expect(eventTypeLabel('inventoryTransferRequest')).toBe('Traslado de inventario')
    expect(eventTypeLabel('convertQuotationToOrder')).toBe('Convertir cotización en pedido')
  })

  it('un tipo desconocido se muestra tal cual', () => {
    expect(eventTypeLabel('tipoNuevo')).toBe('tipoNuevo')
  })

  it('el filtro ofrece todos los tipos con nombre', () => {
    expect(EVENT_TYPE_OPTIONS.map((option) => option.value)).toEqual(Object.keys(EVENT_TYPE_LABELS))
    expect(EVENT_TYPE_OPTIONS).toHaveLength(7)
  })

  it('cada nombre cabe en una hoja de Excel (31 caracteres)', () => {
    for (const label of Object.values(EVENT_TYPE_LABELS)) {
      expect(label.length).toBeLessThanOrEqual(31)
    }
  })
})
