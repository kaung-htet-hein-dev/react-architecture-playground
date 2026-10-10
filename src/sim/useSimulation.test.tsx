import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../app/SettingsProvider'
import type { Scenario, Step } from './types'
import { useSimulation } from './useSimulation'

const frame = (i: number, extra: Partial<Step> = {}): Step => ({
  phase: 'render',
  activeLine: i,
  tree: [],
  log: [],
  domOps: [],
  preview: { values: { i } },
  caption: `step ${i}`,
  ...extra,
})

/** idle + `n` steps; `errorAt` marks one step as an error. */
const scenario: Scenario<{ n: number; errorAt?: number }> = ({ n, errorAt }) =>
  Array.from({ length: n + 1 }, (_, i) => frame(i, i === errorAt ? { status: 'error' } : {}))

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>

const setup = (params: { n: number; errorAt?: number }, live = false) =>
  renderHook((p: { n: number; errorAt?: number }) => useSimulation(scenario, p, { live }), { wrapper, initialProps: params })

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useSimulation', () => {
  it('starts idle at index 0 with total = steps - 1', () => {
    const { result } = setup({ n: 7 })
    expect(result.current.index).toBe(0)
    expect(result.current.total).toBe(7)
    expect(result.current.status).toBe('idle')
    expect(result.current.step.caption).toBe('step 0')
  })

  it('steps forward and back, paused in between, complete at the last step', () => {
    const { result } = setup({ n: 3 })
    act(() => result.current.stepForward())
    expect(result.current.index).toBe(1)
    expect(result.current.status).toBe('paused')
    act(() => result.current.stepBack())
    expect(result.current.status).toBe('idle')
    act(() => result.current.seek(3))
    expect(result.current.status).toBe('complete')
    act(() => result.current.stepForward())
    expect(result.current.index).toBe(3)
    act(() => result.current.reset())
    expect(result.current.index).toBe(0)
  })

  it('autoplays at the speed interval and stops at the last step', () => {
    const { result } = setup({ n: 3 })
    act(() => result.current.play())
    expect(result.current.index).toBe(1)
    expect(result.current.status).toBe('running')
    act(() => vi.advanceTimersByTime(1100))
    expect(result.current.index).toBe(2)
    act(() => result.current.setSpeed(2))
    act(() => vi.advanceTimersByTime(550))
    expect(result.current.index).toBe(3)
    expect(result.current.status).toBe('complete')
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(3)
  })

  it('uses the R-S3 intervals', () => {
    const { result } = setup({ n: 9 })
    act(() => result.current.setSpeed(0.25))
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(3199))
    expect(result.current.index).toBe(1)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.index).toBe(2)
    act(() => result.current.setSpeed(0.5))
    act(() => vi.advanceTimersByTime(1800))
    expect(result.current.index).toBe(3)
  })

  it('pause stops autoplay', () => {
    const { result } = setup({ n: 5 })
    act(() => result.current.play())
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(1)
  })

  it('playback stops on an error step and cannot step past it', () => {
    const { result } = setup({ n: 5, errorAt: 3 })
    act(() => result.current.play())
    act(() => vi.advanceTimersByTime(1100 * 5))
    expect(result.current.index).toBe(3)
    expect(result.current.status).toBe('error')
    act(() => result.current.stepForward())
    expect(result.current.index).toBe(3)
    act(() => result.current.seek(5))
    expect(result.current.index).toBe(3)
  })

  it('replays from the start when played at the end', () => {
    const { result } = setup({ n: 2 })
    act(() => result.current.seek(2))
    act(() => result.current.play())
    expect(result.current.index).toBe(1)
    expect(result.current.status).toBe('running')
  })

  it('regenerates and resets on param change, keeps the step when live', () => {
    const reset = setup({ n: 4 })
    act(() => reset.result.current.seek(3))
    reset.rerender({ n: 6 })
    expect(reset.result.current.total).toBe(6)
    expect(reset.result.current.index).toBe(0)

    const live = setup({ n: 4 }, true)
    act(() => live.result.current.seek(3))
    live.rerender({ n: 2 })
    expect(live.result.current.index).toBe(2)
  })

  it('does not autoplay in reduced motion: play moves one step', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { result } = setup({ n: 4 })
    act(() => result.current.play())
    expect(result.current.index).toBe(1)
    expect(result.current.status).toBe('paused')
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.index).toBe(1)
  })
})
