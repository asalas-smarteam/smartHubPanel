import { ArrowLeftIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { CopyableId } from '@/components/copyable-id'
import { DetailItem } from '@/components/detail-item'
import { DetailSection } from '@/components/detail-section'
import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TenantGate } from '@/features/scope/tenant-picker'
import { useCompanyName } from '@/features/scope/use-company-name'
import { scopeSearch, useScope } from '@/features/scope/use-scope'
import { formatDateTime } from '@/lib/dates'
import { formatNumber } from '@/lib/format'

import { useScheduledTasks } from './api'
import {
  EMPTY_VALUE,
  modeLabel,
  objectLabel,
  operatorLabel,
  taskTypeLabel,
  timeZoneLabel,
} from './constants'
import { dynamicText, filterValueText } from './format'
import { describeSchedule } from './schedule'
import { TaskStatusBadge } from './task-status'

const yesNo = (value) => (value ? 'Sí' : 'No')

function Filters({ filters }) {
  if (filters.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin filtros: trae todos los registros.</p>
  }
  return (
    <Table aria-label="Filtros de la tarea">
      <TableHeader>
        <TableRow>
          {['Propiedad', 'Operador', 'Valor', 'Dinámico', 'Por defecto', 'Editable'].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filters.map((filter, index) => (
          <TableRow key={`${filter.property}-${index}`}>
            <TableCell className="font-mono text-xs">{filter.property ?? EMPTY_VALUE}</TableCell>
            <TableCell>{operatorLabel(filter.operator)}</TableCell>
            <TableCell className="max-w-80 font-mono text-xs whitespace-normal">
              {filter.isDynamic ? (
                <span className="font-sans text-sm text-muted-foreground">Calculado al correr</span>
              ) : (
                filterValueText(filter.value)
              )}
            </TableCell>
            <TableCell>{dynamicText(filter)}</TableCell>
            <TableCell>{yesNo(filter.isDefault)}</TableCell>
            <TableCell>{yesNo(filter.editable)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Detalle de una tarea programada (plan 4r). Sale de la misma lista: no hay otro pedido. */
export function TaskPage() {
  const { id } = useParams()
  const scope = useScope()
  const companyName = useCompanyName(scope)
  const tasks = useScheduledTasks(scope)
  const search = scopeSearch(scope)

  const back = (
    <Link
      to={`/tareas${search}`}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Volver a Tareas programadas
    </Link>
  )

  if (scope.picksTenant && !scope.ready) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <TenantGate scope={scope} what="esta tarea" />
      </div>
    )
  }
  if (tasks.isPending) return <LoadingState />
  if (tasks.isError) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="glass rounded-xl">
          <ErrorState error={tasks.error} onRetry={tasks.refetch} />
        </div>
      </div>
    )
  }

  const task = tasks.data.find((item) => item.id === id)
  if (!task) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <div className="glass rounded-xl">
          <EmptyState title="No encontramos esa tarea">
            Puede que se haya borrado o que sea de otra empresa.
          </EmptyState>
        </div>
      </div>
    )
  }

  const schedule = describeSchedule(task.schedule)
  const zone = timeZoneLabel(task.schedule.timeZone)
  const syncsHref = `/syncs${search ? `${search}&` : '?'}taskId=${encodeURIComponent(task.id)}`

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusBadge active={task.active} />
          <Badge variant="outline">{taskTypeLabel(task.type)}</Badge>
          {scope.picksTenant && (
            <span className="text-sm text-muted-foreground">Empresa {companyName ?? '…'}</span>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{task.name ?? EMPTY_VALUE}</h1>
          <Button asChild variant="outline">
            <Link to={syncsHref}>Ver corridas</Link>
          </Button>
        </div>
      </div>

      <Card className="py-4">
        <CardContent className="px-4">
          <dl className="grid gap-4 sm:grid-cols-3">
            <DetailItem label="Objeto">{objectLabel(task.objectType)}</DetailItem>
            <DetailItem label="Modo">{modeLabel(task.mode)}</DetailItem>
            <DetailItem label="Recurso del ERP">
              <span className="font-mono text-xs">{task.sourcePath ?? EMPTY_VALUE}</span>
            </DetailItem>
            <DetailItem label="Registros por lote">
              {task.batchSize ? formatNumber(task.batchSize) : EMPTY_VALUE}
            </DetailItem>
            <DetailItem label="Trae asociaciones">{yesNo(task.associationsEnabled)}</DetailItem>
            <DetailItem label="Guarda el id del CRM en el ERP">
              {yesNo(task.requireCrmIdUpdate)}
            </DetailItem>
            <DetailItem label="Id">
              <CopyableId id={task.id} />
            </DetailItem>
          </dl>
        </CardContent>
      </Card>

      <DetailSection title="Horario">
        <dl className="grid gap-4 sm:grid-cols-3">
          <DetailItem label="Cuándo">{schedule ? schedule.when : 'Sin programación'}</DetailItem>
          <DetailItem label="Días">{schedule ? schedule.days : EMPTY_VALUE}</DetailItem>
          <DetailItem label="Zona horaria">{zone ?? EMPTY_VALUE}</DetailItem>
          <DetailItem label="Última corrida">
            {task.lastRunAt ? formatDateTime(task.lastRunAt) : 'Nunca'}
          </DetailItem>
          <DetailItem label="Próxima ejecución">
            {task.nextRunAt ? formatDateTime(task.nextRunAt) : EMPTY_VALUE}
          </DetailItem>
        </dl>
      </DetailSection>

      {task.lastError && (
        <DetailSection title="Último error">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-status-error-fg">
            {task.lastError}
          </p>
        </DetailSection>
      )}

      <DetailSection title="Filtros">
        <Filters filters={task.filters} />
      </DetailSection>

      <DetailSection title="Orden">
        {task.orderBy.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin orden definido.</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {task.orderBy.map((order, index) => (
              <li key={`${order.property}-${index}`}>
                <span className="font-mono text-xs">{order.property ?? EMPTY_VALUE}</span>
                {' · '}
                {order.direction === 'asc' ? 'ascendente' : 'descendente'}
              </li>
            ))}
          </ol>
        )}
      </DetailSection>
    </div>
  )
}
