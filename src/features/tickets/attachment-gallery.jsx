import { ImageOffIcon } from 'lucide-react'
import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

function Thumbnail({ attachment, src, onOpen }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span className="flex h-24 w-36 flex-col items-center justify-center gap-1 rounded-md border bg-muted text-center text-xs text-muted-foreground">
        <ImageOffIcon className="size-4" aria-hidden="true" />
        Imagen no disponible
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="overflow-hidden rounded-md border bg-white shadow-xs transition hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      aria-label={`Ver ${attachment.filename}`}
    >
      <img
        src={src}
        alt={attachment.filename}
        loading="lazy"
        className="h-24 w-36 object-cover"
        onError={() => setBroken(true)}
      />
    </button>
  )
}

/**
 * Miniaturas de las imágenes de un mensaje; al hacer clic se abren en grande.
 * @param {{ attachments: Array<{ fileId: string, filename: string }>, urlFor: (fileId: string) => string }} props
 */
export function AttachmentGallery({ attachments, urlFor }) {
  const [open, setOpen] = useState(null)
  if (!attachments?.length) return null

  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label="Imágenes adjuntas">
        {attachments.map((attachment) => (
          <li key={attachment.fileId}>
            <Thumbnail
              attachment={attachment}
              src={urlFor(attachment.fileId)}
              onOpen={() => setOpen(attachment)}
            />
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle className="truncate pr-8">{open?.filename}</DialogTitle>
          <DialogDescription className="sr-only">
            Imagen adjunta en tamaño completo
          </DialogDescription>
          {open && (
            <img
              src={urlFor(open.fileId)}
              alt={open.filename}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
