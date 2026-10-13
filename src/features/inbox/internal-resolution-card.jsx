import { LockIcon, PencilIcon } from 'lucide-react'
import { useId, useState } from 'react'

import { FormAlert } from '@/components/form-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { TEXT_MAX } from '@/features/tickets/constants'
import { getErrorMessage } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/dates'

/** Resolución interna del ticket (solo Smarteam): ver, agregar o corregir. */
export function InternalResolutionCard({ resolution, onSave }) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  function startEditing() {
    setText(resolution?.text ?? '')
    setError(null)
    setEditing(true)
  }

  async function save(event) {
    event.preventDefault()
    const value = text.trim()
    if (!value) return setError('La resolución interna no puede quedar vacía.')
    setSaving(true)
    try {
      await onSave(value)
      setEditing(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="gap-3 py-4" role="region" aria-label="Resolución interna">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <LockIcon className="size-4 text-brand-royal" aria-hidden="true" />
          Resolución interna
        </CardTitle>
        <Badge variant="info">Solo Smarteam</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {editing ? (
          <form onSubmit={save} noValidate className="flex flex-col gap-2">
            <FormAlert>{error}</FormAlert>
            <label htmlFor={id} className="sr-only">
              Resolución interna
            </label>
            <Textarea
              id={id}
              rows={5}
              maxLength={TEXT_MAX}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        ) : resolution ? (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{resolution.text}</p>
            <p className="text-xs text-muted-foreground">
              {resolution.updatedBy.name} · {formatDateTime(resolution.updatedAt)}
            </p>
            <Button variant="outline" size="sm" className="self-start" onClick={startEditing}>
              <PencilIcon aria-hidden="true" />
              Editar
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Todavía no hay resolución interna. Se pide al resolver el ticket.
            </p>
            <Button variant="outline" size="sm" className="self-start" onClick={startEditing}>
              <PencilIcon aria-hidden="true" />
              Agregar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
