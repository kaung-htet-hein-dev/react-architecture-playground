import { describe, expect, it } from 'vitest'
import { isLayoutParam, layoutVsPassiveTrace, MEASURED_TOP } from './layout-vs-passive'

const paints = (s: ReturnType<typeof layoutVsPassiveTrace>) => s.at(-1)!.console!.filter((c) => c.tag === '[paint]')

describe('playground · useLayoutEffect versus useEffect', () => {
  it('useLayoutEffect: the effect and its re-render happen before the only paint', () => {
    const s = layoutVsPassiveTrace(['useLayoutEffect'])
    expect(paints(s)).toHaveLength(1)
    const tags = s.at(-1)!.console!.map((c) => c.tag)
    expect(tags.indexOf('[effect]')).toBeLessThan(tags.indexOf('[paint]'))
    expect(s.at(-1)!.console!.find((c) => c.tag === '[effect]')!.text).toContain('SyncLane')
    // The preview only shows painted frames: closed until the one paint, at the measured top.
    expect(s.slice(0, -1).every((x) => x.preview.values.open === false)).toBe(true)
    expect(s.at(-1)!.preview.values).toMatchObject({ open: true, top: String(MEASURED_TOP) })
  })
  it('useEffect: the first paint shows top 0, the effect runs after it and the tooltip jumps', () => {
    const s = layoutVsPassiveTrace(['useEffect'])
    expect(paints(s)).toHaveLength(2)
    const tags = s.at(-1)!.console!.map((c) => c.tag)
    expect(tags.indexOf('[paint]')).toBeLessThan(tags.indexOf('[effect]'))
    expect(s.find((x) => x.preview.values.open === true)!.preview.values.top).toBe('0')
    expect(s.at(-1)!.preview.values.top).toBe(String(MEASURED_TOP))
  })
  it('reads the hook name', () => {
    expect(isLayoutParam('useLayoutEffect')).toBe(true)
    expect(isLayoutParam(' useEffect ')).toBe(false)
  })
})
