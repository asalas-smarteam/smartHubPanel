import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'

const numberFormat = new Intl.NumberFormat('es')

/**
 * Controles de paginación del servidor. Usa la API de paginación de TanStack Table
 * (la tabla traduce `pageIndex` base 0 a `page` base 1 de la API).
 */
export function DataTablePagination({ table, total, disabled }) {
  const { pageIndex, pageSize } = table.state.pagination
  const page = pageIndex + 1
  const pageCount = Math.max(1, table.getPageCount())
  const canPrevious = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        {numberFormat.format(total)} {total === 1 ? 'resultado' : 'resultados'}
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2">
          <span id="page-size-label" className="text-muted-foreground">
            Filas por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              size="sm"
              aria-labelledby="page-size-label"
              className="w-auto min-w-[5.5rem] justify-between gap-2"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="font-medium" aria-live="polite">
          Página {page} de {pageCount}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Primera página"
            onClick={() => table.firstPage()}
            disabled={disabled || !canPrevious}
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            onClick={() => table.previousPage()}
            disabled={disabled || !canPrevious}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página siguiente"
            onClick={() => table.nextPage()}
            disabled={disabled || !canNext}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Última página"
            onClick={() => table.lastPage()}
            disabled={disabled || !canNext}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
