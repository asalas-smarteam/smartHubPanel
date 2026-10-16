import { describe, expect, it } from 'vitest'

import { buildWorkbook, CELL_LIMIT, columnLetter } from './workbook'
import { zipFiles } from './zip'

/** Archivos de un zip sin comprimir (lo que arma zipFiles con compress: false). */
function readStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder()
  const files = {}
  let offset = 0
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength
    files[name] = decoder.decode(bytes.slice(start, start + size))
    offset = start + size
  }
  return files
}

describe('xlsx', () => {
  it('letras de columna', () => {
    expect([0, 8, 25, 26, 27, 701, 702].map(columnLetter)).toEqual([
      'A',
      'I',
      'Z',
      'AA',
      'AB',
      'ZZ',
      'AAA',
    ])
  })

  it('arma las partes del libro: hojas, encabezado con estilo, anchos y primera fila fija', async () => {
    const bytes = await buildWorkbook(
      [
        {
          name: 'Crear cotización',
          columns: [
            { header: '#', width: 5 },
            { header: 'Error', width: 34 },
          ],
          rows: [[1, 'A < B & "C"\u0001']],
        },
        { name: 'a/b:c*?[x]', columns: [{ header: 'X' }], rows: [] },
        { name: 'Crear cotización', columns: [{ header: 'X' }], rows: [] },
      ],
      { compress: false },
    )
    const files = readStoredZip(bytes)
    expect(Object.keys(files)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
      'xl/worksheets/sheet3.xml',
    ])
    expect(files['xl/workbook.xml']).toContain('<sheet name="Crear cotización" sheetId="1"')
    expect(files['xl/workbook.xml']).toContain('<sheet name="a b c   x" sheetId="2"')
    expect(files['xl/workbook.xml']).toContain('<sheet name="Crear cotización (2)" sheetId="3"')
    const sheet = files['xl/worksheets/sheet1.xml']
    expect(sheet).toContain('state="frozen"')
    expect(sheet).toContain('<col min="2" max="2" width="34" customWidth="1"/>')
    expect(sheet).toContain(
      '<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">#</t></is></c>',
    )
    expect(sheet).toContain('<c r="A2"><v>1</v></c>')
    expect(sheet).toContain('A &lt; B &amp; &quot;C&quot;</t>')
    expect(files['xl/styles.xml']).toContain('FF1F4E78')
  })

  it('ninguna celda pasa el límite de Excel', async () => {
    const bytes = await buildWorkbook(
      [{ name: 'H', columns: [{ header: 'X' }], rows: [['y'.repeat(CELL_LIMIT + 50)]] }],
      { compress: false },
    )
    const sheet = readStoredZip(bytes)['xl/worksheets/sheet1.xml']
    expect(sheet).toContain('y'.repeat(CELL_LIMIT) + '</t>')
    expect(sheet).not.toContain('y'.repeat(CELL_LIMIT + 1))
  })

  it('zip: firma, cantidad de archivos y CRC del contenido', async () => {
    const bytes = await zipFiles([{ name: 'a.txt', data: 'hola' }], { compress: false })
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(14, true)).toBe(1872820616) // CRC-32 de "hola" (zlib.crc32)
    expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(1)
  })
})
