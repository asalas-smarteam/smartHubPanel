/**
 * Arma el multipart de Soporte (contrato D6): campos de texto + imágenes en `images` repetido.
 * Omite los campos vacíos.
 * @param {Record<string, string | null | undefined>} fields
 * @param {File[]} [images]
 */
export function buildTicketFormData(fields, images = []) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') data.append(key, value)
  }
  for (const image of images) data.append('images', image, image.name || 'imagen.png')
  return data
}
