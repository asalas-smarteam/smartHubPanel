/**
 * Texto para `aria-label` de un gráfico: "Causas: A 10, B 5".
 * @param {string} label
 * @param {Array<[string, string]>} entries Pares [nombre, valor ya formateado].
 */
export function summarize(label, entries) {
  return `${label}: ${entries.map(([name, value]) => `${name} ${value}`).join(', ')}`
}

/**
 * Porcentaje de `value` sobre `max`, escalado a `scale` y redondeado a 2 decimales,
 * para anchos y altos en CSS. 0 si no hay máximo.
 */
export function scaled(value, max, scale = 100) {
  if (!max || !value || value < 0) return 0
  return Math.round((value / max) * scale * 100) / 100
}
