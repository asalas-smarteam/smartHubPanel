import { useCallback, useEffect, useRef, useState } from 'react'

import { validateImages } from './images'

let sequence = 0

/**
 * Estado de las imágenes de un mensaje: agregar (input o pegado), quitar, vista previa y errores.
 * Libera las URLs temporales al quitar, al limpiar y al desmontar.
 */
export function useImageAttachments() {
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState([])
  const imagesRef = useRef(images)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)), [])

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    const { accepted, errors: rejected } = await validateImages(files, imagesRef.current.length)
    setErrors(rejected)
    if (accepted.length === 0) return
    setImages((current) => [
      ...current,
      ...accepted.map((file) => {
        sequence += 1
        return { id: `img-${sequence}`, file, url: URL.createObjectURL(file) }
      }),
    ])
  }, [])

  const remove = useCallback((id) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return current.filter((image) => image.id !== id)
    })
    setErrors([])
  }, [])

  const clear = useCallback(() => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url))
    setImages([])
    setErrors([])
  }, [])

  /** Para `onPaste` del formulario: toma las imágenes del portapapeles (Ctrl+V). */
  const handlePaste = useCallback(
    (event) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (files.length === 0) return
      event.preventDefault()
      addFiles(files)
    },
    [addFiles],
  )

  return {
    images,
    errors,
    files: images.map((image) => image.file),
    addFiles,
    remove,
    clear,
    handlePaste,
  }
}
