// Catálogo de causas de error de ejemplo (contrato F5). En la API real vive en el backend:
// expresión sobre `lastError` → causa con etiqueta genérica (sin nombres de sistemas) y grupo fijo.
// El panel no clasifica nada; la API simulada usa este catálogo para armar el resumen.

/** Grupos fijos del contrato, en el orden en que el panel los presenta. */
export const CAUSE_GROUPS = [
  'deal_data',
  'fiscal_data',
  'destination_validation',
  'master_blocked',
  'connectivity',
  'other',
]

export const OTHER_CAUSE = Object.freeze({ key: 'other', label: 'Otro error', group: 'other' })

/** Reglas en orden: gana la primera que calza. */
export const ERROR_CAUSES = [
  {
    key: 'fiscal_id_incomplete',
    label: 'Identificación fiscal incompleta',
    group: 'fiscal_data',
    pattern: /identificaci[oó]n fiscal/i,
  },
  {
    key: 'customer_inactive',
    label: 'Cliente o prospecto inactivo',
    group: 'master_blocked',
    pattern: /(cliente|prospecto)\b.*\binactivo/i,
  },
  {
    key: 'customer_without_code',
    label: 'Cliente sin código en destino',
    group: 'master_blocked',
    pattern: /no tiene c[oó]digo/i,
  },
  {
    key: 'no_line_items',
    label: 'Negocio sin líneas de producto',
    group: 'deal_data',
    pattern: /l[ií]neas de producto/i,
  },
  {
    key: 'missing_company_contact',
    label: 'Negocio sin empresa ni contacto',
    group: 'deal_data',
    pattern: /sin empresa ni contacto/i,
  },
  {
    key: 'value_too_long',
    label: 'Valor demasiado largo en el contacto',
    group: 'deal_data',
    pattern: /demasiado largo/i,
  },
  {
    key: 'price_list_unmapped',
    label: 'Lista de precios sin mapear',
    group: 'deal_data',
    pattern: /lista de precios/i,
  },
  {
    key: 'payment_terms_mismatch',
    label: 'Condición de pago no coincide',
    group: 'destination_validation',
    pattern: /condici[oó]n de pago/i,
  },
  {
    key: 'invalid_subgroup',
    label: 'Subgrupo no válido para el cliente',
    group: 'destination_validation',
    pattern: /subgrupo/i,
  },
  {
    key: 'item_not_found',
    label: 'Artículo inexistente en destino',
    group: 'destination_validation',
    pattern: /art[ií]culo\b.*\bno existe/i,
  },
  {
    key: 'timeout',
    label: 'Tiempo de espera agotado',
    group: 'connectivity',
    pattern: /tiempo de espera|conexi[oó]n rechazada/i,
  },
]

/**
 * Causa de un mensaje de error: `{ key, label, group }`.
 * @param {string | null | undefined} message
 */
export function classifyError(message) {
  const rule = message ? ERROR_CAUSES.find((cause) => cause.pattern.test(message)) : null
  return rule ? { key: rule.key, label: rule.label, group: rule.group } : { ...OTHER_CAUSE }
}
