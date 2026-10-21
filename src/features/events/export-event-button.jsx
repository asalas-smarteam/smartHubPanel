import { DownloadIcon, LoaderCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/errors'
import { downloadBlob } from '@/lib/download'
import { buildWorkbook, XLSX_TYPE } from '@/lib/xlsx/workbook'

import { eventFileName, reportSheets } from './export'

/**
 * "Exportar a Excel" en el detalle (plan 4u): solo este evento, con el mismo formato que el
 * reporte de la lista. Usa lo que la página ya cargó; no pide nada más a la API.
 * @param {{ event: object, exchange: object | null, companyName?: string | null }} props
 */
export function ExportEventButton({ event, exchange, companyName }) {
  const [running, setRunning] = useState(false)

  async function exportEvent() {
    setRunning(true)
    try {
      const bytes = await buildWorkbook(reportSheets([{ ...event, exchange }]))
      downloadBlob(
        new Blob([bytes], { type: XLSX_TYPE }),
        eventFileName(new Date(), companyName, event),
      )
      toast.success('Se exportó el evento.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button type="button" variant="outline" onClick={exportEvent} disabled={running}>
      {running ? (
        <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
      ) : (
        <DownloadIcon aria-hidden="true" />
      )}
      Exportar a Excel
    </Button>
  )
}
