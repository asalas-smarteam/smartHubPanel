import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link, useSearchParams } from 'react-router'

import { BarList } from '@/components/charts/bar-list'
import { ChartCard } from '@/components/charts/chart-card'
import { ChartLegend } from '@/components/charts/chart-legend'
import { RatioBar } from '@/components/charts/ratio-bar'
import { StackedBars } from '@/components/charts/stacked-bars'
import { StatTile } from '@/components/charts/stat-tile'
import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
import { PeriodPicker } from '@/components/period-picker'
import { Can } from '@/features/auth/can'
import { PERMISSIONS } from '@/features/auth/permissions'
import { TenantGate, TenantPicker } from '@/features/scope/tenant-picker'
import { useCompanyName } from '@/features/scope/use-company-name'
import { TENANT_PARAM, useScope } from '@/features/scope/use-scope'
import { formatRelative } from '@/lib/dates'
import { formatNumber, formatPercent, formatSeconds, ratio } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useIntegrationSummary } from './api'
import {
  causeGroup,
  CLIENT_TICKET_METRICS,
  DEFAULT_PERIOD,
  MAX_DAILY_ROWS,
  PERIOD_OPTIONS,
  PERIOD_PARAM,
  STATUS_SERIES,
} from './constants'
import {
  activityRows,
  attemptOutcome,
  causesSentence,
  groupSentence,
  multiAttemptSentence,
  periodSubtitle,
  worstSentence,
} from './summaries'
import { SupportCard } from './support-card'

const STEP_COLORS = {
  errored: 'var(--chart-bad)',
  corrected: 'var(--chart-warn)',
  waiting: 'var(--chart-wait)',
  in_process: 'var(--chart-wait)',
}

function usePeriod() {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = Number(searchParams.get(PERIOD_PARAM))
  const days = PERIOD_OPTIONS.includes(value) ? value : DEFAULT_PERIOD
  const setDays = (next) =>
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      if (next === DEFAULT_PERIOD) params.delete(PERIOD_PARAM)
      else params.set(PERIOD_PARAM, String(next))
      return params
    })
  return [days, setDays]
}

const PERIOD_BUTTONS = PERIOD_OPTIONS.map((days) => ({ value: days, label: `${days} días` }))

function Hero({ totals }) {
  // Los corregidos cuentan como bien: terminaron creados en un reintento (plan 4k).
  const share = ratio(totals.created + totals.corrected, totals.documents)
  return (
    <section
      aria-label="Resultado del período"
      className="glass-strong flex flex-wrap items-center gap-x-9 gap-y-5 rounded-3xl px-6 py-6 sm:px-8 sm:py-7"
    >
      <div className="flex flex-[0_1_16rem] flex-col gap-2.5">
        <p className="text-6xl leading-none font-extrabold tracking-[-0.04em] tabular-nums sm:text-[76px]">
          {formatNumber(share === null ? null : share * 100)}
          <span className="text-3xl sm:text-[38px]">%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          de los documentos se crearon en el sistema destino (contando los corregidos)
        </p>
      </div>
      <div className="min-w-0 flex-[1_1_26rem]">
        <RatioBar
          label="Documentos del período"
          segments={STATUS_SERIES.map((series) => ({ ...series, value: totals[series.key] }))}
        />
      </div>
    </section>
  )
}

function Indicators({ totals }) {
  return (
    <section
      aria-label="Indicadores"
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7"
    >
      <StatTile
        label="Documentos"
        value={formatNumber(totals.documents)}
        note={`sobre ${formatNumber(totals.references)} negocios distintos`}
      />
      <StatTile
        label="Creados"
        value={formatNumber(totals.created)}
        tone="positive"
        note={`${formatPercent(totals.created, totals.documents)} del total`}
      />
      <StatTile
        label="Corregidos"
        value={formatNumber(totals.corrected)}
        tone={totals.corrected > 0 ? 'warning' : 'default'}
        note="con error, pero un reintento los dejó bien"
      />
      <StatTile
        label="Con error"
        value={formatNumber(totals.errored)}
        tone={totals.errored > 0 ? 'negative' : 'default'}
        note={`${formatPercent(totals.errored, totals.documents)} del total, sin corregir`}
      />
      <StatTile
        label="Negocios sin documento"
        value={formatNumber(totals.referencesWithoutDocument)}
        tone={totals.referencesWithoutDocument > 0 ? 'negative' : 'default'}
        note={`de ${formatNumber(totals.references)} negocios`}
      />
      <StatTile
        label="Tiempo medio"
        value={formatSeconds(totals.avgDurationSeconds)}
        note={
          totals.avgDurationCreatedSeconds === null
            ? undefined
            : `${formatSeconds(totals.avgDurationCreatedSeconds)} cuando sale bien`
        }
      />
      <StatTile
        label="En cola o procesando"
        value={formatNumber(totals.pending)}
        note={
          totals.oldestPendingAt
            ? `el más antiguo ${formatRelative(totals.oldestPendingAt)}`
            : 'nada en espera'
        }
      />
    </section>
  )
}

function Activity({ byDay }) {
  const byWeek = byDay.length > MAX_DAILY_ROWS
  const rows = activityRows(byDay, { byWeek })
  const title = byWeek ? 'Actividad por semana' : 'Actividad por día'
  return (
    <ChartCard title={title} description={worstSentence(rows, { byWeek })}>
      <ChartLegend items={STATUS_SERIES} />
      <StackedBars
        label={title}
        labelHeader={byWeek ? 'Semana' : 'Día'}
        series={STATUS_SERIES}
        rows={rows}
      />
    </ChartCard>
  )
}

function Causes({ causes, groups, errored }) {
  const groupItems = groups.map((group) => ({
    key: group.key,
    label: causeGroup(group.key).label,
    value: group.count,
    color: causeGroup(group.key).color,
  }))
  const sentence = causesSentence(causes, errored)
  return (
    <ChartCard
      title="Errores por causa"
      description={sentence && `${sentence} El color es el grupo de causa.`}
    >
      <BarList
        label="Errores por causa"
        labelHeader="Causa"
        valueHeader="Errores"
        empty="Ningún error en el período."
        items={causes.map((cause) => ({
          key: cause.key,
          label: cause.label,
          value: cause.count,
          color: causeGroup(cause.group).color,
        }))}
      />
      {groupItems.length > 0 && (
        <>
          <ChartLegend
            className="border-t border-border pt-3.5"
            items={groupItems.map((item) => ({ ...item, value: formatNumber(item.value) }))}
          />
          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <h3 className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Por grupo de causa
            </h3>
            {groupSentence(groups, errored) && (
              <p className="mb-2 text-[13px] text-subtle-foreground">
                {groupSentence(groups, errored)}
              </p>
            )}
            <BarList
              label="Por grupo de causa"
              labelHeader="Grupo"
              valueHeader="Errores"
              items={groupItems}
            />
          </div>
        </>
      )}
    </ChartCard>
  )
}

function stepTime(iso) {
  return format(parseISO(iso), "EEE d '·' HH:mm", { locale: es }).replace('.', '')
}

function MultiAttempt({ multiAttempt, tenantKey }) {
  const sentence = multiAttemptSentence(multiAttempt)
  const linkTo = (reference) => {
    const params = new URLSearchParams({ referencia: reference })
    if (tenantKey) params.set(TENANT_PARAM, tenantKey)
    return `/eventos?${params}`
  }
  return (
    <ChartCard title="Negocios que necesitaron más de un intento" description={sentence}>
      {multiAttempt.total === 0 && (
        <p className="text-sm text-muted-foreground">Ningún negocio necesitó más de un intento.</p>
      )}
      <div className="flex flex-col">
        {multiAttempt.items.map((item) => (
          <article
            key={item.reference}
            className="flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <Link
                to={linkTo(item.reference)}
                className="text-[15px] font-bold text-foreground underline-offset-4 hover:text-link hover:underline"
              >
                {item.title ?? 'Negocio sin nombre'}
              </Link>
              <span className="font-mono text-[11.5px] text-subtle-foreground">
                negocio {item.reference} · {item.attempts} intentos · {attemptOutcome(item)}
              </span>
            </div>
            <ol className="flex flex-col gap-1.5">
              {item.steps.map((step, index) => (
                <li
                  key={`${step.at}-${index}`}
                  className="grid grid-cols-[0.875rem_6.5rem_1fr] items-start gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[5px] size-2.5 rounded-full"
                    style={{ backgroundColor: STEP_COLORS[step.status] ?? 'var(--chart-ok)' }}
                  />
                  <time dateTime={step.at} className="font-mono text-xs text-subtle-foreground">
                    {stepTime(step.at)}
                  </time>
                  <span className="text-[13.5px] text-muted-foreground">
                    <b className="text-foreground">
                      Intento {index + 1}
                      {step.documentNumber ? ` — documento ${step.documentNumber}` : ''}.
                    </b>{' '}
                    {step.summary}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      {multiAttempt.total > multiAttempt.items.length && (
        <p className="text-xs text-subtle-foreground">
          Se muestran los {multiAttempt.items.length} con más intentos.
        </p>
      )}
    </ChartCard>
  )
}

function Summary({ data, days, tenantKey, staffView }) {
  const { totals } = data
  const showSupport = CLIENT_TICKET_METRICS && !staffView
  if (totals.documents === 0) {
    return (
      <div className="glass rounded-xl">
        <EmptyState title="Todavía no hay documentos en este período">
          Cuando la integración procese documentos, vas a ver aquí cómo le fue.
        </EmptyState>
      </div>
    )
  }
  return (
    <>
      {(data.correctionsFailed || data.correctionsCapped) && (
        <p role="note" className="text-sm text-muted-foreground">
          {data.correctionsFailed
            ? 'No se pudieron revisar los errores corregidos: los corregidos cuentan como "Con error".'
            : 'Hay muchos errores en el período: los corregidos se calcularon con los 1.000 más recientes.'}
        </p>
      )}
      <Hero totals={totals} />
      <Indicators totals={totals} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cn('min-w-0', !showSupport && 'lg:col-span-2')}>
          <Activity byDay={data.byDay} />
        </div>
        {showSupport && (
          <Can permission={PERMISSIONS.TICKETS_READ}>
            <SupportCard days={days} />
          </Can>
        )}
      </div>
      <Causes causes={data.causes} groups={data.groups} errored={totals.errored} />
      <MultiAttempt multiAttempt={data.multiAttempt} tenantKey={tenantKey} />
    </>
  )
}

/** Inicio: estado de la integración de una empresa en los últimos 7, 30 o 90 días (F1 a F6). */
export function DashboardPage() {
  const scope = useScope()
  const [days, setDays] = usePeriod()
  const summary = useIntegrationSummary(scope, days)
  const companyName = useCompanyName(scope)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {companyName && (
            <p className="font-mono text-[11px] tracking-[0.16em] text-subtle-foreground uppercase">
              {companyName} · últimos {days} días
            </p>
          )}
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-[34px]">
            Estado de la integración
          </h1>
          {summary.data && (
            <p className="text-sm text-muted-foreground">
              {periodSubtitle(summary.data.totals.documents, summary.data.period)}
            </p>
          )}
        </div>
        <PeriodPicker value={days} options={PERIOD_BUTTONS} onChange={setDays} />
      </header>

      {scope.picksTenant && !scope.ready ? (
        <TenantGate scope={scope} what="su integración" />
      ) : (
        <>
          {scope.picksTenant && (
            <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
              <TenantPicker value={scope.tenantKey} onChange={scope.setTenant} />
            </div>
          )}
          {summary.isPending && <LoadingState />}
          {summary.isError && !summary.data && (
            <div className="glass rounded-xl">
              <ErrorState error={summary.error} onRetry={summary.refetch} />
            </div>
          )}
          {summary.data && (
            <Summary
              data={summary.data}
              days={days}
              tenantKey={scope.picksTenant ? scope.tenantKey : null}
              staffView={scope.picksTenant}
            />
          )}
        </>
      )}
    </div>
  )
}
