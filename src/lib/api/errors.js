/**
 * Error de la API del panel. `code` viene del campo `error` (o `code`) del cuerpo;
 * si el cuerpo no trae código, queda `null` y se usa el status para el mensaje.
 */
export class ApiError extends Error {
  /**
   * @param {{ status: number, code?: string | null, message?: string | null, details?: unknown }} init
   */
  constructor({ status, code = null, message = null, details }) {
    super(message || `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.serverMessage = message
    this.details = details
  }
}

/** Códigos que el front reconoce (contrato asumido, ver plan 4a §3.2 C5). */
export const ERROR_CODES = Object.freeze({
  INVALID_CREDENTIALS: 'invalid_credentials',
  UNAUTHORIZED: 'unauthorized',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  PASSWORD_CHANGE_REQUIRED: 'password_change_required',
  INVALID_CURRENT_PASSWORD: 'invalid_current_password',
  FORBIDDEN: 'forbidden',
  MISSING_PANEL_HEADER: 'missing_panel_header',
  VALIDATION_ERROR: 'validation_error',
  EMAIL_TAKEN: 'email_taken',
  NOT_FOUND: 'not_found',
  INVALID_RESPONSE: 'invalid_response',
  NETWORK_ERROR: 'network_error',
  INVALID_TRANSITION: 'invalid_transition',
  TOO_MANY_IMAGES: 'too_many_images',
  INVALID_IMAGE: 'invalid_image',
  IMAGE_TOO_LARGE: 'image_too_large',
  PAGE_WINDOW_EXCEEDED: 'page_window_exceeded',
})

const MESSAGES_BY_CODE = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  unauthorized: 'Tu sesión expiró. Vuelve a entrar.',
  too_many_attempts: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
  password_change_required: 'Debes cambiar tu contraseña antes de continuar.',
  invalid_current_password: 'La contraseña actual no es correcta.',
  forbidden: 'No tienes permiso para esta acción.',
  missing_panel_header: 'La solicitud fue rechazada por seguridad. Recarga la página.',
  email_taken: 'Ese correo ya está registrado.',
  not_found: 'No encontramos lo que buscas.',
  invalid_response: 'El servidor respondió algo inesperado. Inténtalo más tarde.',
  network_error: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  invalid_transition: 'El ticket cambió mientras lo veías. Ya actualizamos la información.',
  too_many_images: 'Máximo 5 imágenes por mensaje.',
  invalid_image: 'Solo se aceptan imágenes PNG, JPEG o WebP.',
  image_too_large: 'Cada imagen puede pesar como máximo 5 MB.',
  page_window_exceeded: 'Para ver tickets más antiguos, filtra por estado, empresa o categoría.',
}

const MESSAGES_BY_STATUS = {
  400: 'Revisa los datos e inténtalo de nuevo.',
  401: MESSAGES_BY_CODE.unauthorized,
  403: MESSAGES_BY_CODE.forbidden,
  404: MESSAGES_BY_CODE.not_found,
  409: 'Hay un conflicto con los datos actuales.',
  413: 'El archivo es demasiado grande.',
  429: MESSAGES_BY_CODE.too_many_attempts,
}

/**
 * Texto en español para mostrar al usuario.
 * Para `validation_error` se usa el mensaje del servidor si lo hay.
 * @param {unknown} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.code === ERROR_CODES.VALIDATION_ERROR && error.serverMessage) {
      return error.serverMessage
    }
    if (error.code && MESSAGES_BY_CODE[error.code]) return MESSAGES_BY_CODE[error.code]
    if (MESSAGES_BY_STATUS[error.status]) return MESSAGES_BY_STATUS[error.status]
    if (error.status >= 500)
      return 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.'
  }
  return 'Ocurrió un error inesperado.'
}

/** @param {unknown} error @param {string} code */
export function hasErrorCode(error, code) {
  return error instanceof ApiError && error.code === code
}
