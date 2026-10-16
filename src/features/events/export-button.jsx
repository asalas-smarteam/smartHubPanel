import { DownloadIcon, LoaderCircleIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/errors'
import { downloadBlob } from '@/lib/download'
import { formatNumber } from '@/lib/format'
import { buildWorkbook, XLSX_TYPE } from '@/lib/xlsx/workbook'

import { collectEvents, EXPORT_LIMIT, reportFileName, reportSheets } from './export'

/**
 * "Exportar a Excel": los eventos del filtro actual (hasta EXPORT_LIMIT), con lo recibido,
 * enviado y respondido de cada uno (plan 4j).
 * @param {{ scope: object, filters: object, total?: number, companyName?: string | null }} props
 */
export function ExportEventsButton({ scope, filters, total, companyName }) {
  const [progress, setProgress] = useState(null)
  const running = progress !== null
  const controller = useRef(null)

  async function exportReport() {
    controller.current = new AbortController()
    setProgress({ done: 0, total: 0 })
    try {
      const { events, total: found } = await collectEvents(scope, filters, {
        signal: controller.current.signal,
        onProgress: (done, count) => setProgress({ done, total: count }),
      })
      if (events.length === 0) {
        toast.info('No hay eventos con estos filtros para exportar.')
        return
      }
      const bytes = await buildWorkbook(reportSheets(events))
      downloadBlob(new Blob([bytes], { type: XLSX_TYPE }), reportFileName(new Date(), companyName))
      toast.success(
        found > events.length
          ? `Se exportaron los ${formatNumber(events.length)} más recientes de ${formatNumber(found)}. Acota con los filtros para el resto.`
          : `Se exportaron ${formatNumber(events.length)} eventos.`,
      )
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(getErrorMessage(error))
    } finally {
      controller.current = null
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={exportReport}
        disabled={running || total === 0}
        title={
          total > EXPORT_LIMIT
            ? `Se exportan los ${formatNumber(EXPORT_LIMIT)} más recientes del filtro`
            : undefined
        }
      >
        {running ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
        ) : (
          <DownloadIcon aria-hidden="true" />
        )}
        Exportar a Excel
      </Button>
      {running && (
        <Button type="button" variant="ghost" size="sm" onClick={() => controller.current?.abort()}>
          Cancelar
        </Button>
      )}
      <span role="status" className="text-sm text-muted-foreground">
        {running && progress.total > 0
          ? `Preparando ${formatNumber(progress.done)} de ${formatNumber(progress.total)}…`
          : running
            ? 'Buscando eventos…'
            : ''}
      </span>
    </div>
  )
}
