import { describe, expect, it } from 'vitest'

import { averageDurations } from './durations'

const at = (seconds) => new Date(Date.UTC(2026, 9, 15, 10, 0, seconds)).toISOString()
const run = (task, start, end) => ({ task, start: at(start), end: end === null ? null : at(end) })
const accessors = {
  start: (item) => item.start,
  end: (item) => item.end,
  group: (item) => ({ key: item.task, label: `Tarea ${item.task}` }),
}

describe('averageDurations', () => {
  it('promedia por grupo, de mayor a menor, y pondera el total por cantidad', () => {
    const items = [run('a', 0, 10), run('a', 0, 20), run('b', 0, 50)]
    expect(averageDurations(items, accessors)).toEqual({
      groups: [
        { key: 'b', label: 'Tarea b', count: 1, averageMs: 50_000 },
        { key: 'a', label: 'Tarea a', count: 2, averageMs: 15_000 },
      ],
      // (10 + 20 + 50) / 3, no (15 + 50) / 2.
      overall: { count: 3, averageMs: 80_000 / 3 },
    })
  })

  it('descarta registros sin fin, con fechas inválidas o con duración negativa', () => {
    const items = [
      run('a', 0, 4),
      run('a', 0, null),
      run('a', 10, 5),
      { task: 'a', start: 'no-es-fecha', end: at(3) },
    ]
    expect(averageDurations(items, accessors)).toEqual({
      groups: [{ key: 'a', label: 'Tarea a', count: 1, averageMs: 4000 }],
      overall: { count: 1, averageMs: 4000 },
    })
  })

  it('sin registros: sin grupos y sin promedio', () => {
    expect(averageDurations([], accessors)).toEqual({
      groups: [],
      overall: { count: 0, averageMs: null },
    })
  })

  it('empates de promedio: por nombre', () => {
    const items = [run('z', 0, 5), run('m', 0, 5)]
    expect(averageDurations(items, accessors).groups.map((g) => g.key)).toEqual(['m', 'z'])
  })
})
