import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = '__all'

/**
 * Selector de filtro con opción "Todos". `value` vacío = sin filtro.
 * @param {{ id: string, label: string, value: string, options: Array<{ value: string, label: string }>, allLabel?: string, onChange: (value: string | null) => void }} props
 */
export function FilterSelect({ id, label, value, options, allLabel = 'Todos', onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
        <SelectTrigger id={id} className="min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
