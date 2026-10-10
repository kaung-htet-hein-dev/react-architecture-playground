import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { SPEED_MS, type Scenario, type SimSpeed, type SimStatus, type SimulationApi, type Step } from './types'

export interface UseSimulationOptions {
  /**
   * Keep the current step (clamped) when params change instead of resetting to step 0
   * (R-S5: chapters with live updates, e.g. ch3, ch4, ch7).
   */
  live?: boolean
  /** Initial step index (e.g. from a `?step=` URL param). */
  initialIndex?: number
  initialSpeed?: SimSpeed
  /**
   * When params change, start the new trace at step 1 and keep playing (one step only in
   * reduced motion). For traces started by a user action, e.g. ch5's Add item / Remove first.
   * Wins over `live`. Has no effect on the first trace.
   */
  autoplay?: boolean
}

interface State<D> {
  key: string
  scenario: unknown
  steps: Step<D>[]
  index: number
  playing: boolean
}

const clamp = (i: number, steps: readonly Step<unknown>[]) => Math.max(0, Math.min(steps.length - 1, i))

/** First error step at or before `i`: playback can't move past an error. */
function stopAt<D>(steps: readonly Step<D>[], i: number): number {
  for (let k = 0; k <= i && k < steps.length; k++) if (steps[k].status === 'error') return k
  return i
}

/** R-S4: error on an error step, complete at the last step, running while autoplaying, idle at 0. */
export function simStatus(steps: readonly Step<unknown>[], index: number, playing: boolean): SimStatus {
  if (steps[index]?.status === 'error') return 'error'
  if (index >= steps.length - 1 && index > 0) return 'complete'
  if (playing) return 'running'
  return index === 0 ? 'idle' : 'paused'
}

/**
 * Playback for a scenario trace (R-S3). The trace is regenerated when the scenario or the
 * params change (compared by JSON), resetting to step 0 unless `live`. Autoplay ticks every
 * 3200 / 1800 / 1100 / 550 ms for 0.25× / 0.5× / 1× / 2×, stops at an error step or the last
 * step, and is off in reduced motion (Play then moves one step).
 */
export function useSimulation<P, D = unknown>(scenario: Scenario<P, D>, params: P, opts: UseSimulationOptions = {}): SimulationApi<D> {
  const reduced = useReducedMotion()
  const key = JSON.stringify(params) ?? ''
  const [speed, setSpeed] = useState<SimSpeed>(opts.initialSpeed ?? 1)
  const [state, setState] = useState<State<D>>(() => {
    const steps = scenario(params)
    return { key, scenario, steps, index: stopAt(steps, clamp(opts.initialIndex ?? 0, steps)), playing: false }
  })

  let s = state
  if (state.key !== key || state.scenario !== scenario) {
    // Params changed: regenerate during render (React's "adjust state on prop change" pattern).
    const steps = scenario(params)
    let index = opts.live ? stopAt(steps, clamp(state.index, steps)) : 0
    let playing = false
    if (opts.autoplay) {
      index = stopAt(steps, clamp(1, steps))
      playing = !reduced && index < steps.length - 1 && steps[index].status !== 'error'
    }
    s = { key, scenario, steps, index, playing }
    setState(s)
  }

  const { steps, index } = s
  const last = steps.length - 1
  const running = s.playing && !reduced

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setState((cur) => {
        const next = stopAt(cur.steps, Math.min(cur.index + 1, cur.steps.length - 1))
        const done = next >= cur.steps.length - 1 || cur.steps[next].status === 'error' || next === cur.index
        return { ...cur, index: next, playing: !done }
      })
    }, SPEED_MS[speed])
    return () => clearInterval(id)
  }, [running, speed])

  const go = (i: number) => setState((cur) => ({ ...cur, index: stopAt(cur.steps, clamp(i, cur.steps)), playing: false }))

  const stepForward = () => setState((cur) => ({ ...cur, index: stopAt(cur.steps, clamp(cur.index + 1, cur.steps)), playing: false }))

  const play = () =>
    setState((cur) => {
      const atEnd = cur.index >= cur.steps.length - 1 || cur.steps[cur.index].status === 'error'
      const from = atEnd ? 0 : cur.index
      const next = stopAt(cur.steps, clamp(from + 1, cur.steps))
      const done = reduced || next >= cur.steps.length - 1 || cur.steps[next].status === 'error'
      return { ...cur, index: next, playing: !done }
    })

  return {
    step: steps[index],
    steps,
    index,
    total: last,
    status: simStatus(steps, index, running),
    speed,
    play,
    pause: () => setState((cur) => ({ ...cur, playing: false })),
    stepForward,
    stepBack: () => setState((cur) => ({ ...cur, index: Math.max(0, cur.index - 1), playing: false })),
    reset: () => go(0),
    seek: go,
    setSpeed,
  }
}
