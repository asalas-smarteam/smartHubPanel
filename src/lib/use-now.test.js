import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNow } from './use-now'

const START = Date.parse('2026-11-04T16:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useNow', () => {
  it('devuelve la hora actual y se actualiza cada minuto', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current).toBe(START)

    act(() => vi.advanceTimersByTime(59_000))
    expect(result.current).toBe(START)
    act(() => vi.advanceTimersByTime(1_000))
    expect(result.current).toBe(START + 60_000)
  })

  it('acepta otro intervalo y lo limpia al desmontar', () => {
    const { result, unmount } = renderHook(() => useNow(1_000))
    act(() => vi.advanceTimersByTime(1_000))
    expect(result.current).toBe(START + 1_000)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
