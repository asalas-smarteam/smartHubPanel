// Validación de imágenes en el navegador, antes de enviar (el servidor vuelve a validar).
// Reglas del spec: hasta 5 por mensaje, 5 MB cada una, PNG/JPEG/WebP por sus bytes; nunca SVG.

export const MAX_IMAGES = 5
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'

const megabytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/**
 * Tipo real de la imagen según sus primeros bytes, o null si no es PNG, JPEG ni WebP.
 * @param {Blob} file
 * @returns {Promise<'image/png' | 'image/jpeg' | 'image/webp' | null>}
 */
export async function detectImageType(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const startsWith = (signature, offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value)

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  // "RIFF" .... "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'
  }
  return null
}

/**
 * Filtra los archivos nuevos según las reglas. Devuelve los aceptados y un mensaje por cada rechazo.
 * @param {File[]} files Archivos nuevos (de un input o pegados).
 * @param {number} currentCount Imágenes ya elegidas en el mismo mensaje.
 * @returns {Promise<{ accepted: File[], errors: string[] }>}
 */
export async function validateImages(files, currentCount = 0) {
  const accepted = []
  const errors = []
  for (const file of files) {
    const name = file.name || 'Imagen pegada'
    if (currentCount + accepted.length >= MAX_IMAGES) {
      errors.push(`${name}: máximo ${MAX_IMAGES} imágenes por mensaje.`)
      continue
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`${name}: pesa ${megabytes(file.size)}; el máximo es 5 MB.`)
      continue
    }
    if (!(await detectImageType(file))) {
      errors.push(`${name}: solo se aceptan imágenes PNG, JPEG o WebP.`)
      continue
    }
    accepted.push(file)
  }
  return { accepted, errors }
}
