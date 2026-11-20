// Códigos del ERP que el administrador puede editar (plan 5c, contrato O2).
// - Vendedor: un entero, o varios separados por coma (ya hay datos así).
// - Empleado (digitador): un solo entero.
// Vacío significa "sin valor" (null). El panel no comprueba que el código exista en el ERP.

const DIGITS = /^\d+$/
export const CODE_MAX_LENGTH = 100

/** Texto para mostrar en el campo a partir del valor guardado (número, texto o null). */
export const codeToInput = (value) =>
  value === null || value === undefined ? '' : String(value).trim()

/**
 * Normaliza el vendedor: `{ value }` con `null`, `"53"` o `"113,758"`, o `{ error }`.
 * Quita espacios y códigos repetidos; conserva el orden.
 */
export function parseSellerCodes(input) {
  const text = String(input ?? '').trim()
  if (!text) return { value: null, codes: [] }
  const parts = text.split(',').map((part) => part.trim())
  if (parts.some((part) => !DIGITS.test(part))) {
    return { error: 'Usa solo números; para varios códigos, sepáralos con coma.' }
  }
  const codes = [...new Set(parts)]
  const value = codes.join(',')
  if (value.length > CODE_MAX_LENGTH) return { error: 'Son demasiados códigos.' }
  return { value, codes }
}

/** Normaliza el empleado (digitador): `{ value }` con `null` o `"67"`, o `{ error }`. */
export function parseEmployeeCode(input) {
  const text = String(input ?? '').trim()
  if (!text) return { value: null }
  if (!DIGITS.test(text)) return { error: 'Debe ser un solo número, sin comas ni letras.' }
  if (text.length > 18) return { error: 'El número es demasiado largo.' }
  return { value: text }
}

/** ¿Dos valores guardados representan el mismo código? (53 y "53" son iguales). */
export const sameCode = (a, b) => (codeToInput(a) || null) === (codeToInput(b) || null)
