import { describe, expect, it } from 'vitest'

import {
  applyCorrectionsToSummary,
  localDay,
  matchCorrections,
  withCorrection,
} from './corrections'

const ev = (id, status, at, extra = {}) => ({
  id,
  type: 'createQuotation',
  status,
  reference: 'R1',
  createdAt: at,
  ...extra,
})

describe('corregidos', () => {
  it('mismo negocio y mismo tipo, con un evento posterior que terminó bien (el primero)', () => {
    const errors = [
      ev('e1', 'errored', '2026-10-01T10:00:00Z'),
      ev('e2', 'errored', '2026-10-01T12:00:00Z'),
      ev('e3', 'errored', '2026-10-03T10:00:00Z'),
      ev('e4', 'errored', '2026-10-01T10:00:00Z', { reference: null }),
      ev('e5', 'errored', '2026-10-01T10:00:00Z', { type: 'createDeal' }),
    ]
    const candidates = [
      ev('ok2', 'destination_created', '2026-10-02T10:00:00Z'),
      ev('ok1', 'completed', '2026-10-01T11:00:00Z'),
      ev('w', 'waiting', '2026-10-04T10:00:00Z'),
      ev('other', 'completed', '2026-10-04T10:00:00Z', { reference: 'R2' }),
    ]
    const map = matchCorrections(errors, candidates)
    expect([...map]).toEqual([
      ['e1', { id: 'ok1', at: '2026-10-01T11:00:00Z' }],
      ['e2', { id: 'ok2', at: '2026-10-02T10:00:00Z' }],
    ])
    expect(withCorrection(errors[0], map)).toMatchObject({
      status: 'corrected',
      correctedBy: { id: 'ok1' },
    })
    expect(withCorrection(errors[2], map)).toBe(errors[2])
  })

  it('día local en la zona del período', () => {
    expect(localDay('2026-10-06T03:00:00Z', 'America/Costa_Rica')).toBe('2026-10-05')
  })

  it('resumen del Inicio: los corregidos salen de "con error", de su día, de las causas y grupos', () => {
    const cause = { key: 'timeout', label: 'Tiempo de espera agotado', group: 'connectivity' }
    const summary = {
      period: { from: '', to: '', tz: 'America/Costa_Rica' },
      totals: { documents: 5, created: 2, errored: 3, pending: 0 },
      byDay: [{ date: '2026-10-05', created: 2, errored: 3, pending: 0 }],
      causes: [
        { ...cause, count: 1 },
        { key: 'other', label: 'Otro error', group: 'other', count: 2 },
      ],
      groups: [
        { key: 'other', count: 2 },
        { key: 'connectivity', count: 1 },
      ],
      multiAttempt: {
        total: 1,
        items: [
          {
            reference: 'R1',
            steps: [
              { at: '2026-10-05T16:00:00Z', status: 'errored', summary: cause.label },
              { at: '2026-10-05T17:00:00Z', status: 'completed', summary: 'Documento creado' },
            ],
          },
        ],
      },
    }
    const fixed = applyCorrectionsToSummary(summary, [
      { id: 'x', reference: 'R1', createdAt: '2026-10-05T16:00:00Z', cause },
    ])
    expect(fixed.totals).toMatchObject({ corrected: 1, errored: 2, created: 2 })
    expect(fixed.byDay[0]).toMatchObject({ corrected: 1, errored: 2 })
    expect(fixed.causes.map((c) => c.key)).toEqual(['other'])
    expect(fixed.groups).toEqual([{ key: 'other', count: 2 }])
    expect(fixed.multiAttempt.items[0].steps[0]).toMatchObject({
      status: 'corrected',
      summary: 'Tiempo de espera agotado (corregido)',
    })
    expect(applyCorrectionsToSummary(summary, [])).toBe(summary)
  })
})
