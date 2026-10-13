import { detectImageType, MAX_IMAGE_BYTES, MAX_IMAGES } from '@/features/tickets/images'

import { storeUpload } from '../tickets-db'
import { errorResponse } from './utils'

export const STATUSES = ['abierto', 'en_progreso', 'esperando_cliente', 'resuelto']
export const CATEGORIES = ['sincronizacion', 'documentos', 'precios', 'mapeos', 'acceso', 'otro']
const MAX_PAGE_SIZE = 100

/** Lee `page` y `pageSize` (1 y 25 por defecto). Devuelve null si son inválidos. */
export function readPagination(params) {
  const page = params.get('page') === null ? 1 : Number(params.get('page'))
  const pageSize = params.get('pageSize') === null ? 25 : Number(params.get('pageSize'))
  const valid =
    Number.isInteger(page) &&
    page >= 1 &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= MAX_PAGE_SIZE
  return valid ? { page, pageSize } : null
}

export function paginate(list, { page, pageSize }) {
  const start = (page - 1) * pageSize
  return { items: list.slice(start, start + pageSize), page, pageSize, total: list.length }
}

export const byLastActivityDesc = (a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)

/** Texto obligatorio con largo máximo. Devuelve el texto o una respuesta de error. */
export function requireText(value, { label, max }) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return { response: errorResponse(400, 'validation_error', `${label} es obligatorio.`) }
  if (text.length > max) {
    return {
      response: errorResponse(400, 'validation_error', `${label} supera los ${max} caracteres.`),
    }
  }
  return { text }
}

/**
 * Valida y guarda las imágenes del campo `images` (contrato D6) como lo haría el servidor:
 * cantidad, tamaño y tipo por los primeros bytes.
 */
export async function readImages(formData) {
  const files = formData.getAll('images').filter((value) => typeof value === 'object')
  if (files.length > MAX_IMAGES) return { response: errorResponse(400, 'too_many_images') }
  const checked = []
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) return { response: errorResponse(413, 'image_too_large') }
    const contentType = await detectImageType(file)
    if (!contentType) return { response: errorResponse(400, 'invalid_image') }
    checked.push({ file, contentType })
  }
  return { attachments: checked.map(({ file, contentType }) => storeUpload(file, contentType)) }
}

export async function readFormData(request) {
  try {
    return await request.formData()
  } catch {
    return null
  }
}
