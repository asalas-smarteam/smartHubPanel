import { ImagePlusIcon, XIcon } from 'lucide-react'
import { useId, useRef } from 'react'

import { Button } from '@/components/ui/button'

import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES } from './images'

/**
 * Botón para adjuntar imágenes + vista previa + errores. El estado viene de `useImageAttachments`.
 * Pegar con Ctrl+V lo maneja el formulario contenedor con `attachments.handlePaste`.
 */
export function ImagePicker({ attachments, disabled }) {
  const inputRef = useRef(null)
  const inputId = useId()
  const { images, errors, addFiles, remove } = attachments
  const full = images.length >= MAX_IMAGES

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Adjuntar imágenes"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
        >
          <ImagePlusIcon aria-hidden="true" />
          Adjuntar imágenes
        </Button>
        <span className="text-xs text-muted-foreground">
          PNG, JPEG o WebP · hasta {MAX_IMAGES}, 5 MB cada una · también puedes pegar con Ctrl+V
        </span>
      </div>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Imágenes a enviar">
          {images.map((image) => (
            <li key={image.id} className="relative">
              <img
                src={image.url}
                alt={image.file.name || 'Imagen pegada'}
                className="h-20 w-28 rounded-md border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(image.id)}
                className="absolute -top-2 -right-2 rounded-full bg-brand-navy p-1 text-white shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={`Quitar ${image.file.name || 'imagen pegada'}`}
                disabled={disabled}
              >
                <XIcon className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
