import { describe, expect, it } from 'vitest'

import { makeImageFile } from '@/test/files'

import { detectImageType, MAX_IMAGE_BYTES, validateImages } from './images'

describe('detectImageType', () => {
  it.each([
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'],
  ])('reconoce %s por sus bytes', async (kind, expected) => {
    await expect(detectImageType(makeImageFile(kind))).resolves.toBe(expected)
  })

  it('rechaza GIF y SVG', async () => {
    await expect(detectImageType(makeImageFile('gif'))).resolves.toBeNull()
    await expect(detectImageType(makeImageFile('svg'))).resolves.toBeNull()
  })

  it('no se fía de la extensión ni del tipo declarado', async () => {
    const fake = makeImageFile('svg', { name: 'captura.png', type: 'image/png' })
    await expect(detectImageType(fake)).resolves.toBeNull()
  })
})

describe('validateImages', () => {
  it('acepta hasta 5 en total y explica cada rechazo', async () => {
    const files = Array.from({ length: 4 }, (_, i) => makeImageFile('png', { name: `f${i}.png` }))
    const { accepted, errors } = await validateImages(files, 2)
    expect(accepted).toHaveLength(3)
    expect(errors).toEqual(['f3.png: máximo 5 imágenes por mensaje.'])
  })

  it('rechaza las de más de 5 MB', async () => {
    const big = makeImageFile('jpeg', { name: 'grande.jpg', size: MAX_IMAGE_BYTES + 1 })
    const { accepted, errors } = await validateImages([big])
    expect(accepted).toHaveLength(0)
    expect(errors[0]).toMatch(/grande\.jpg: pesa 5\.0 MB; el máximo es 5 MB\./)
  })

  it('rechaza SVG aunque se llame .png', async () => {
    const fake = makeImageFile('svg', { name: 'truco.png', type: 'image/png' })
    const { accepted, errors } = await validateImages([fake, makeImageFile('webp')])
    expect(accepted).toHaveLength(1)
    expect(errors).toEqual(['truco.png: solo se aceptan imágenes PNG, JPEG o WebP.'])
  })
})
