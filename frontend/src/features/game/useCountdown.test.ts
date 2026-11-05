import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('учитывает сдвиг часов сервера', () => {
    // часы сервера спешат на 2 секунды, до конца по серверу 10 секунд
    const { result } = renderHook(() => useCountdown(112_000, 2_000))
    expect(result.current).toBe(10_000)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(result.current).toBe(7_000)
  })

  it('не уходит в минус', () => {
    const { result } = renderHook(() => useCountdown(101_000, 0))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(result.current).toBe(0)
  })
})
