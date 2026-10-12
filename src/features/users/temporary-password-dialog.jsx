import { CheckIcon, CopyIcon, KeyRoundIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Muestra la contraseña temporal UNA sola vez. Quien lo usa debe descartar el valor
 * (estado y resultado de la mutación) en `onClose`.
 * @param {{ data: { name: string, email: string, password: string } | null, onClose: () => void }} props
 */
export function TemporaryPasswordDialog({ data, onClose }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function handleOpenChange(open) {
    if (!open) {
      setCopied(false)
      onClose()
    }
  }

  return (
    <Dialog open={Boolean(data)} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-brand-royal" aria-hidden="true" />
            Contraseña temporal
          </DialogTitle>
          <DialogDescription>
            Para <strong className="text-foreground">{data?.name}</strong> ({data?.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="temporary-password">Contraseña temporal</Label>
          <div className="flex gap-2">
            <Input
              id="temporary-password"
              readOnly
              value={data?.password ?? ''}
              className="font-mono text-base tracking-wider"
              onFocus={(event) => event.target.select()}
            />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
          </div>
          <p className="rounded-md bg-orange-50 px-3 py-2 text-sm text-brand-accent-deep">
            Esta contraseña se muestra una sola vez. Pásala al usuario por el canal habitual: al
            entrar se le pedirá cambiarla.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Ya la copié
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
