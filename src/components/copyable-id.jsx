import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RESET_MS = 2000

/**
 * Id de base de datos en monoespaciada con un botón para copiarlo (plan 4g). Sirve para que el
 * cliente pase el id exacto al reportar algo y Smarteam lo busque sin errores de tipeo.
 */
export function CopyableId({ id, className }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  if (!id) return <span className={className}>—</span>

  async function copy() {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className={cn('inline-flex max-w-full items-center gap-1', className)}>
      <span className="font-mono text-xs break-all">{id}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 text-muted-foreground"
        onClick={copy}
        aria-label="Copiar id"
        title="Copiar id"
      >
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </Button>
      <span role="status" className="sr-only">
        {copied ? 'Id copiado' : ''}
      </span>
    </span>
  )
}
