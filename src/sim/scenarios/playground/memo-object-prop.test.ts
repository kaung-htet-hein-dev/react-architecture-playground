import { describe, expect, it } from 'vitest'
import { memoObjectPropTrace } from './memo-object-prop'

describe('playground · memo broken by a new object prop', () => {
  const steps = memoObjectPropTrace(['0'])
  it('Chart renders even though it is memoized, and writes nothing', () => {
    expect(steps).toHaveLength(9)
    const chart = (i: number) => steps[i].data!.panes[1].tree.find((n) => n.id === 'chart')
    expect(chart(5)).toMatchObject({ state: 'render', tag: 'memo ✕' })
    expect(steps.at(-1)!.console!.some((c) => c.text.includes('options changed (new object)'))).toBe(true)
  })
  it('commits exactly one DOM op, for the button text', () => {
    const ops = steps.at(-1)!.domOps
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'setText', value: '1' })
    expect(ops.some((o) => o.target === 'svg')).toBe(false)
  })
})
