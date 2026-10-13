// Archivos de prueba con los bytes iniciales reales de cada formato.
const SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  webp: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
}
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }

/**
 * @param {'png' | 'jpeg' | 'webp' | 'gif' | 'svg'} kind
 * @param {{ name?: string, size?: number, type?: string }} [options]
 */
export function makeImageFile(kind, { name, size = 1024, type } = {}) {
  if (kind === 'svg') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    return new File([svg], name ?? 'dibujo.svg', { type: type ?? 'image/svg+xml' })
  }
  const bytes = new Uint8Array(Math.max(size, SIGNATURES[kind].length))
  bytes.set(SIGNATURES[kind])
  return new File([bytes], name ?? `captura.${kind === 'jpeg' ? 'jpg' : kind}`, {
    type: type ?? MIME[kind],
  })
}
