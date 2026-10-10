import { describe, expect, it } from 'vitest'
import { search, useTransitionTrace } from './use-transition'

describe('playground · useTransition with a heavy list', () => {
  const steps = useTransitionTrace()
  const log = steps.at(-1)!.console!.map((c) => c.text)
  it('puts the input on SyncLane and the list on TransitionLane', () => {
    expect(steps[1].queue!.map((u) => u.lane)).toEqual(['SyncLane', 'SyncLane', 'TransitionLane', 'TransitionLane'])
    expect(steps[2].queue!.filter((u) => u.result === 'skipped · lower priority')).toHaveLength(2)
  })
  it('yields mid-list, then a keystroke interrupts and the transition restarts with the latest text', () => {
    expect(log.some((t) => t.includes('yielded after'))).toBe(true)
    expect(log.some((t) => t.startsWith('transition interrupted'))).toBe(true)
    expect(steps.findIndex((s) => s.timeline!.blocks.some((b) => b.kind === 'gone'))).toBeGreaterThan(5)
  })
  it('the input never waits: "r" and "re" are painted before the list changes', () => {
    const firstList = steps.findIndex((s) => (s.preview.values.rows as string[])[0] !== 'angular')
    const re = steps.findIndex((s) => s.preview.values.query === 're')
    expect(steps.findIndex((s) => s.preview.values.query === 'r')).toBeLessThan(re)
    expect(re).toBeLessThan(firstList)
    expect(steps.at(-1)!.preview.values).toMatchObject({ query: 're', pending: false, rows: search('re') })
  })
})
