import { describe, expect, it } from 'vitest'

import {
  activityRows,
  attemptOutcome,
  causesSentence,
  groupSentence,
  multiAttemptSentence,
  periodSubtitle,
  worstSentence,
} from './summaries'

const day = (date, created, errored, pending = 0) => ({ date, created, errored, pending })

describe('filas de actividad', () => {
  const byDay = [
    day('2026-10-04', 3, 0), // domingo
    day('2026-10-05', 20, 2),
    day('2026-10-06', 22, 9),
    day('2026-10-12', 5, 1, 2),
  ]

  it('una fila por día con su rótulo corto', () => {
    expect(activityRows(byDay)).toEqual([
      {
        key: '2026-10-04',
        date: '2026-10-04',
        label: 'dom 4',
        values: { created: 3, corrected: 0, errored: 0, pending: 0 },
      },
      {
        key: '2026-10-05',
        date: '2026-10-05',
        label: 'lun 5',
        values: { created: 20, corrected: 0, errored: 2, pending: 0 },
      },
      {
        key: '2026-10-06',
        date: '2026-10-06',
        label: 'mar 6',
        values: { created: 22, corrected: 0, errored: 9, pending: 0 },
      },
      {
        key: '2026-10-12',
        date: '2026-10-12',
        label: 'lun 12',
        values: { created: 5, corrected: 0, errored: 1, pending: 2 },
      },
    ])
  })

  it('por semana (desde el lunes) cuando se pide', () => {
    expect(activityRows(byDay, { byWeek: true })).toEqual([
      {
        key: '2026-09-28',
        date: '2026-09-28',
        label: '28 sep',
        values: { created: 3, corrected: 0, errored: 0, pending: 0 },
      },
      {
        key: '2026-10-05',
        date: '2026-10-05',
        label: '5 oct',
        values: { created: 42, corrected: 0, errored: 11, pending: 0 },
      },
      {
        key: '2026-10-12',
        date: '2026-10-12',
        label: '12 oct',
        values: { created: 5, corrected: 0, errored: 1, pending: 2 },
      },
    ])
  })
})

describe('frases de resumen', () => {
  it('el peor día: más errores; si empatan, el de mayor proporción', () => {
    const rows = activityRows([
      day('2026-10-05', 20, 9),
      day('2026-10-06', 2, 9),
      day('2026-10-07', 30, 1),
    ])
    expect(worstSentence(rows)).toBe('El martes 6 fue el peor: 9 de 11 con error.')
  })

  it('la peor semana', () => {
    const rows = activityRows([day('2026-09-29', 10, 4), day('2026-10-06', 10, 1)], {
      byWeek: true,
    })
    expect(worstSentence(rows, { byWeek: true })).toBe(
      'La semana del 28 sep fue la peor: 4 de 14 con error.',
    )
  })

  it('sin errores lo dice; sin documentos no dice nada', () => {
    expect(worstSentence(activityRows([day('2026-10-05', 3, 0)]))).toBe(
      'Ningún día con errores en el período.',
    )
    expect(worstSentence(activityRows([day('2026-10-05', 0, 0)]))).toBeNull()
  })

  it('causas', () => {
    const cause = (count) => ({ key: `k${count}`, label: 'x', group: 'other', count })
    expect(causesSentence([cause(30), cause(16)], 46)).toBe(
      'Las 2 causas detrás de los 46 errores del período.',
    )
    expect(causesSentence([cause(3)], 3)).toBe(
      'Una sola causa detrás de los 3 errores del período.',
    )
    expect(causesSentence([cause(1)], 1)).toBe('Una sola causa detrás del único error del período.')
    expect(causesSentence([], 0)).toBeNull()
  })

  it('grupo principal con su porcentaje; con menos de 2 errores no se resume', () => {
    expect(
      groupSentence(
        [
          { key: 'deal_data', count: 25 },
          { key: 'fiscal_data', count: 21 },
        ],
        46,
      ),
    ).toBe(
      '25 de los 46 errores (54\u00a0%) nacen del dato que viaja en el negocio: se corrigen en el origen, no en la integración.',
    )
    expect(groupSentence([{ key: 'connectivity', count: 1 }], 1)).toBeNull()
  })

  it('negocios con más de un intento y cuánto tardó la corrección', () => {
    const item = (resolvedAfterSeconds, statuses) => ({
      resolvedAfterSeconds,
      steps: statuses.map((status) => ({ status })),
    })
    expect(
      multiAttemptSentence({
        total: 12,
        items: [
          item(18 * 60, ['errored', 'completed']),
          item(3 * 86_400, ['errored', 'errored', 'completed']),
          item(600, ['completed', 'completed']), // sin errores: no cuenta para el rango
          item(900, ['completed', 'errored', 'completed']), // el error vino después: tampoco
          item(null, ['errored', 'errored']),
        ],
      }),
    ).toBe(
      '12 negocios entraron más de una vez. Entre los que arrastraron errores, la corrección tardó de 18 min a 3 d.',
    )
    expect(multiAttemptSentence({ total: 1, items: [item(7800, ['errored', 'completed'])] })).toBe(
      'Un negocio entró más de una vez. La corrección tardó 2 h 10.',
    )
    expect(multiAttemptSentence({ total: 0, items: [] })).toBeNull()
  })

  it('resultado de cada negocio: el tiempo solo cuenta si hubo errores antes del documento', () => {
    const item = (resolvedAfterSeconds, statuses) => ({
      resolvedAfterSeconds,
      steps: statuses.map((status) => ({ status })),
    })
    expect(attemptOutcome(item(7800, ['errored', 'destination_created']))).toBe(
      '2 h 10 hasta resolver',
    )
    expect(attemptOutcome(item(360, ['completed', 'errored']))).toBe('creado al primer intento')
    expect(attemptOutcome(item(null, ['errored', 'waiting']))).toBe('sin documento todavía')
  })

  it('subtítulo del período: año una sola vez si no cambia; `to` es exclusivo', () => {
    const period = (from, to) => ({
      from: new Date(...from).toISOString(),
      to: new Date(...to).toISOString(),
    })
    expect(periodSubtitle(471, period([2026, 8, 13], [2026, 9, 13]))).toBe(
      '471 documentos recibidos del 13 de septiembre al 12 de octubre de 2026',
    )
    expect(periodSubtitle(1, period([2025, 11, 20], [2026, 0, 3]))).toBe(
      '1 documento recibido del 20 de diciembre de 2025 al 2 de enero de 2026',
    )
  })
})
