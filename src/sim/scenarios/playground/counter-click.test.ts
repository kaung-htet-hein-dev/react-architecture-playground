import { describe, expect, it } from 'vitest'
import { counterClickTrace } from './counter-click'

describe('playground · counter click', () => {
  const steps = counterClickTrace(['0', '1'])
  it('is idle + 7 steps through all four phases', () => {
    expect(steps).toHaveLength(8)
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'trigger', 'trigger', 'render', 'render', 'reconcile', 'commit', 'commit'])
  })
  it('writes one text node at commit and swaps the trees there', () => {
    expect(steps[5].domOps).toHaveLength(0)
    expect(steps[6].domOps).toHaveLength(1)
    expect(steps[6].data!.panes.map((p) => p.role)).toEqual(['alternate', 'current'])
    expect(steps.at(-1)!.preview.values.count).toBe('1')
  })
  it('an increment of 0 bails out before rendering', () => {
    const s = counterClickTrace(['3', '0'])
    expect(s).toHaveLength(3)
    expect(s.at(-1)!.queue![0].result).toBe('same value · bailed out')
  })
})
