import { describe, expect, it } from 'vitest'
import { setStateInEffectTrace } from './setstate-in-effect'

describe('playground · setState inside useEffect', () => {
  const steps = setStateInEffectTrace(['0', '1'])
  it('one click costs two renders, two commits and two paints', () => {
    expect(steps).toHaveLength(12)
    const tags = steps.at(-1)!.console!.map((c) => c.tag)
    expect(tags.filter((t) => t === '[render]')).toHaveLength(2)
    expect(tags.filter((t) => t === '[commit]')).toHaveLength(2)
    expect(tags.filter((t) => t === '[paint]')).toHaveLength(2)
    expect(steps.at(-1)!.domOps).toHaveLength(2)
  })
  it('the first paint shows a stale doubled, the effect update goes on DefaultLane after paint', () => {
    expect(steps[6].preview.values).toMatchObject({ count: '1', doubled: '0', stale: true })
    expect(steps[7].queue!.at(-1)).toMatchObject({ text: 'setDoubled(1 * 2)', lane: 'DefaultLane' })
    expect(steps.at(-1)!.preview.values).toMatchObject({ count: '1', doubled: '2' })
  })
  it('the second render reuses the alternate tree and root.current swaps back', () => {
    expect(steps[5].data!.panes.map((p) => p.role)).toEqual(['alternate', 'current'])
    expect(steps[8].data!.panes.map((p) => p.role)).toEqual(['wip', 'current'])
    expect(steps[10].data!.panes.map((p) => p.role)).toEqual(['current', 'alternate'])
  })
})
