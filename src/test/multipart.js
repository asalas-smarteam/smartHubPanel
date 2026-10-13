// Multipart a mano para los tests (solo Node + jsdom; el navegador y `--mode mock` no lo usan).
//
// En los tests conviven dos juegos de clases: FormData/File de jsdom (los que usan los
// componentes) y Request/Response de Node (undici, los que usa MSW). Desde Node 24 undici
// no sabe mandar un FormData de jsdom (su File no tiene stream(): "Request body length does
// not match") ni leer uno con request.formData() (el File que arma no pasa su propio
// chequeo). Aquí se arma y se lee el multipart a mano para no depender de la versión de Node.
import { File as NodeFile } from 'node:buffer'

const encoder = new TextEncoder()
const CRLF = '\r\n'

const quote = (value) =>
  String(value)
    .replace(/"/g, '%22')
    .replace(/\r?\n|\r/g, ' ')

function concat(parts) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** FormData de jsdom → bytes multipart y su Content-Type. */
export async function encodeMultipart(formData) {
  const boundary = `----panel-pruebas-${Math.random().toString(16).slice(2)}`
  const parts = []
  for (const [name, value] of formData.entries()) {
    const head = `--${boundary}${CRLF}Content-Disposition: form-data; name="${quote(name)}"`
    if (typeof value === 'string') {
      parts.push(encoder.encode(`${head}${CRLF}${CRLF}${value}${CRLF}`))
    } else {
      const type = value.type || 'application/octet-stream'
      parts.push(
        encoder.encode(
          `${head}; filename="${quote(value.name)}"${CRLF}Content-Type: ${type}${CRLF}${CRLF}`,
        ),
        new Uint8Array(await value.arrayBuffer()),
        encoder.encode(CRLF),
      )
    }
  }
  parts.push(encoder.encode(`--${boundary}--${CRLF}`))
  return { body: concat(parts), contentType: `multipart/form-data; boundary=${boundary}` }
}

// El FormData nativo de Node (jsdom tapa el global): se saca de una respuesta urlencoded.
const NodeFormData = (await new Response(new URLSearchParams()).formData()).constructor

/** Bytes multipart → FormData de Node con File de Node (lo mismo que daría request.formData()). */
export function decodeMultipart(bytes, boundary) {
  const buffer = Buffer.from(bytes)
  const delimiter = Buffer.from(`--${boundary}`)
  const form = new NodeFormData()
  let start = buffer.indexOf(delimiter)
  if (start === -1) throw new TypeError('Multipart sin delimitador')
  while (true) {
    const afterDelimiter = start + delimiter.length
    if (buffer.subarray(afterDelimiter, afterDelimiter + 2).toString() === '--') break
    const next = buffer.indexOf(delimiter, afterDelimiter)
    if (next === -1) throw new TypeError('Multipart sin cierre')
    const part = buffer.subarray(afterDelimiter + 2, next - 2)
    const headerEnd = part.indexOf(`${CRLF}${CRLF}`)
    const headers = part.subarray(0, headerEnd).toString('utf8')
    const content = part.subarray(headerEnd + 4)
    const name = /[;\s]name="([^"]*)"/i.exec(headers)?.[1]
    const filename = /filename="([^"]*)"/i.exec(headers)?.[1]
    const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? ''
    if (filename === undefined) form.append(name, content.toString('utf8'))
    else form.append(name, new NodeFile([content], filename, { type }))
    start = next
  }
  return form
}

/**
 * Instala los dos lados: fetch arma el multipart y Request#formData lo lee.
 * Se llama después de server.listen() para quedar por fuera de la intercepción de MSW.
 * Devuelve la función que deja todo como estaba.
 */
export function installMultipartShim() {
  const originalFetch = globalThis.fetch
  const originalFormData = Request.prototype.formData

  globalThis.fetch = async (input, init) => {
    if (!(init?.body instanceof FormData)) return originalFetch(input, init)
    const { body, contentType } = await encodeMultipart(init.body)
    const headers = new Headers(init.headers)
    headers.set('Content-Type', contentType)
    return originalFetch(input, { ...init, body, headers })
  }

  // MSW entrega un Request propio y su clone() devuelve un Request de otra clase:
  // se parcha el prototipo y también cada copia.
  const originalClone = Request.prototype.clone
  async function formData() {
    const contentType = this.headers.get('content-type') ?? ''
    const boundary = /^multipart\/form-data;\s*boundary=(.+)$/i.exec(contentType)?.[1]
    if (!boundary) return originalFormData.call(this)
    return decodeMultipart(new Uint8Array(await this.arrayBuffer()), boundary)
  }
  Request.prototype.formData = formData
  Request.prototype.clone = function clone() {
    const copy = originalClone.call(this)
    if (copy.formData !== formData) {
      Object.defineProperty(copy, 'formData', { value: formData, configurable: true })
    }
    return copy
  }

  return () => {
    globalThis.fetch = originalFetch
    Request.prototype.formData = originalFormData
    Request.prototype.clone = originalClone
  }
}
