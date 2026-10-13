import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Filtro "Desde / Hasta" con el selector de fecha del navegador (valores `YYYY-MM-DD`).
 * @param {{ idPrefix: string, from: string, to: string, onChange: (name: 'desde' | 'hasta', value: string | null) => void }} props
 */
export function DateRangeFilter({ idPrefix, from, to, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${idPrefix}-from`}>Desde</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          className="w-40"
          value={from}
          max={to || undefined}
          onChange={(event) => onChange('desde', event.target.value || null)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={`${idPrefix}-to`}>Hasta</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          className="w-40"
          value={to}
          min={from || undefined}
          onChange={(event) => onChange('hasta', event.target.value || null)}
        />
      </div>
    </div>
  )
}
