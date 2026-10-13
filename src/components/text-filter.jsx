import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Filtro de texto que se aplica al presionar Enter o al salir del campo (no en cada tecla).
 * Se reinicia cuando cambia `value` desde afuera (p. ej. al cambiar de empresa).
 * @param {{ id: string, label: string, value: string, onApply: (value: string | null) => void, placeholder?: string }} props
 */
export function TextFilter({ id, label, value, onApply, placeholder }) {
  const apply = (input) => {
    const next = input.value.trim()
    if (next !== value) onApply(next || null)
  }
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        key={value}
        id={id}
        className="w-48"
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(event) => apply(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') apply(event.currentTarget)
        }}
      />
    </div>
  )
}
