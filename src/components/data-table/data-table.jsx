import { rowPaginationFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'

import { EmptyState, ErrorState } from '@/components/page-states'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { DataTablePagination } from './data-table-pagination'

// Estables a nivel de módulo (requisito de TanStack Table v9).
const features = tableFeatures({ rowPaginationFeature })
const EMPTY_ROWS = []
const SKELETON_ROWS = 5

/**
 * Tabla con paginación del servidor (TanStack Table v9, `manualPagination`).
 *
 * @param {{
 *   columns: Array<object>,
 *   data?: { items: Array<object>, page: number, pageSize: number, total: number },
 *   page: number,
 *   pageSize: number,
 *   onPaginationChange: (next: { page: number, pageSize: number }) => void,
 *   isPending?: boolean,
 *   isFetching?: boolean,
 *   error?: unknown,
 *   onRetry?: () => void,
 *   emptyTitle?: string,
 *   emptyDescription?: string,
 *   getRowId?: (row: object) => string,
 *   label: string,
 * }} props
 * Cada columna puede definir `meta.cellClassName` (p. ej. dejar que el título haga salto de línea).
 */
export function DataTable({
  columns,
  data,
  page,
  pageSize,
  onPaginationChange,
  isPending,
  isFetching,
  error,
  onRetry,
  emptyTitle = 'No hay resultados',
  emptyDescription,
  getRowId,
  label,
}) {
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize }), [page, pageSize])

  const handlePaginationChange = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      const sizeChanged = next.pageSize !== pagination.pageSize
      onPaginationChange({
        page: sizeChanged ? 1 : next.pageIndex + 1,
        pageSize: next.pageSize,
      })
    },
    [pagination, onPaginationChange],
  )

  const table = useTable({
    features,
    columns,
    data: data?.items ?? EMPTY_ROWS,
    rowCount: data?.total ?? 0,
    manualPagination: true,
    state: { pagination },
    onPaginationChange: handlePaginationChange,
    getRowId,
  })

  const rows = table.getRowModel().rows
  const columnCount = columns.length
  const showError = Boolean(error) && !data

  return (
    <div className="glass overflow-hidden rounded-xl">
      <Table aria-label={label} aria-busy={isPending || isFetching ? 'true' : undefined}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(isFetching && !isPending && 'opacity-60 transition-opacity')}>
          {isPending &&
            Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell colSpan={columnCount}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {!isPending && showError && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="whitespace-normal">
                <ErrorState error={error} onRetry={onRetry} />
              </TableCell>
            </TableRow>
          )}

          {!isPending && !showError && rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="whitespace-normal">
                <EmptyState title={emptyTitle}>{emptyDescription}</EmptyState>
              </TableCell>
            </TableRow>
          )}

          {!isPending &&
            !showError &&
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {!showError && (
        <DataTablePagination table={table} total={data?.total ?? 0} disabled={isPending} />
      )}
    </div>
  )
}
