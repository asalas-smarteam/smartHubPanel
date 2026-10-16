import { describe, expect, it } from 'vitest'

import { CAUSE_GROUPS, classifyError, ERROR_CAUSES, OTHER_CAUSE } from './error-causes'

describe('catálogo de causas de error (F5)', () => {
  it.each([
    [
      'La identificación fiscal del cliente está incompleta (falta el tipo).',
      'fiscal_id_incomplete',
      'fiscal_data',
    ],
    [
      'El cliente C-10234 está inactivo en el sistema destino.',
      'customer_inactive',
      'master_blocked',
    ],
    [
      'El prospecto P-2231 está inactivo; no se puede cotizar.',
      'customer_inactive',
      'master_blocked',
    ],
    ['El negocio no tiene líneas de producto.', 'no_line_items', 'deal_data'],
    ['Tiempo de espera agotado al llamar al sistema destino.', 'timeout', 'connectivity'],
    [
      'El artículo ITEM-0042 no existe en el sistema destino.',
      'item_not_found',
      'destination_validation',
    ],
    [
      'La lista de precios del negocio no está mapeada.\nRevisar la configuración.',
      'price_list_unmapped',
      'deal_data',
    ],
  ])('%s → %s', (message, key, group) => {
    expect(classifyError(message)).toMatchObject({ key, group })
  })

  it('lo que no calza (o no hay mensaje) es "Otro error"', () => {
    expect(classifyError('Respuesta inesperada del servidor (500).')).toEqual(OTHER_CAUSE)
    expect(classifyError(null)).toEqual(OTHER_CAUSE)
    expect(OTHER_CAUSE).toEqual({ key: 'other', label: 'Otro error', group: 'other' })
  })

  it('cada causa tiene clave única, etiqueta genérica y un grupo fijo', () => {
    const keys = ERROR_CAUSES.map((cause) => cause.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const cause of ERROR_CAUSES) {
      expect(CAUSE_GROUPS).toContain(cause.group)
      expect(cause.label).toMatch(/^[A-ZÁÉÍÓÚ]/)
    }
    expect(CAUSE_GROUPS).toEqual([
      'deal_data',
      'fiscal_data',
      'destination_validation',
      'master_blocked',
      'connectivity',
      'other',
    ])
  })
})
