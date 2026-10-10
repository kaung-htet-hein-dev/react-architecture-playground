import { describe, expect, it } from 'vitest'
import { staleClosureTrace } from './stale-closure'

describe('playground · stale closure in setInterval', () => {
  const steps = staleClosureTrace(['0', '1'])
  it('count stays 1 after three ticks', () => {
    expect(steps.at(-1)!.preview.values).toMatchObject({ count: '1', seconds: '3' })
    expect(steps.at(-1)!.console!.at(-1)!.text).toBe('after 3 s · Count: 1 (expected 3)')
  })
  it('every tick asks for 0 + 1; only the first one writes to the DOM', () => {
    const ticks = steps.at(-1)!.console!.filter((c) => c.tag === '[timer]' && c.text.startsWith('tick'))
    expect(ticks.map((t) => t.text.split(' → ')[1].split(' ')[0])).toEqual(['setCount(0', 'setCount(0', 'setCount(0'])
    expect(steps.at(-1)!.domOps).toHaveLength(1)
    expect(steps[1].queue![0].lane).toBe('DefaultLane')
  })
})
