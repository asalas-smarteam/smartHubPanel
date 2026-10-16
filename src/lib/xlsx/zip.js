// Zip mínimo para armar .xlsx en el navegador (sin dependencias). Cada archivo se comprime con
// `CompressionStream('deflate-raw')` si el navegador lo tiene; si no, se guarda sin comprimir.

const encoder = new TextEncoder()

let crcTable
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const canDeflate = () => {
  try {
    return (
      typeof CompressionStream === 'function' &&
      typeof Blob.prototype.stream === 'function' &&
      Boolean(new CompressionStream('deflate-raw'))
    )
  } catch {
    return false
  }
}

/**
 * @param {Array<{ name: string, data: string | Uint8Array }>} files
 * @param {{ compress?: boolean }} [options] `compress: false` fuerza archivos sin comprimir.
 * @returns {Promise<Uint8Array>}
 */
export async function zipFiles(files, { compress = true } = {}) {
  const deflate = compress && canDeflate()
  const local = []
  const central = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const raw = typeof file.data === 'string' ? encoder.encode(file.data) : file.data
    // Si comprimir falla en este navegador, el archivo va sin comprimir (sigue siendo válido).
    const packed = deflate ? await deflateRaw(raw).catch(() => null) : null
    const data = packed ?? raw
    const crc = crc32(raw)
    const method = packed ? 8 : 0

    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04034b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 0x0800, true) // nombres en UTF-8
    header.setUint16(8, method, true)
    header.setUint32(14, crc, true)
    header.setUint32(18, data.length, true)
    header.setUint32(22, raw.length, true)
    header.setUint16(26, name.length, true)
    local.push(new Uint8Array(header.buffer), name, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, method, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, raw.length, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)

    offset += 30 + name.length + data.length
  }

  const centralSize = central.reduce((acc, part) => acc + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const parts = [...local, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(parts.reduce((acc, part) => acc + part.length, 0))
  let position = 0
  for (const part of parts) {
    out.set(part, position)
    position += part.length
  }
  return out
}
