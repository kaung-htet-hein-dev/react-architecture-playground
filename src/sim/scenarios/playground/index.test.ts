import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET, fillParams, paramDefaults, PRESETS } from '.'

describe('playground presets', () => {
  it('has the 10 presets of R-P8, three setState calls by default', () => {
    expect(PRESETS.map((p) => p.label)).toEqual([
      'Counter click',
      'Three setState calls in one handler',
      'setState inside useEffect',
      'Index versus id keys',
      'memo broken by a new object prop',
      'useLayoutEffect versus useEffect',
      'Stale closure in setInterval',
      'useTransition with a heavy list',
      'Optimistic update with useOptimistic',
      'Conditional hook error',
    ])
    expect(DEFAULT_PRESET).toBe('three-setstate')
  })
  it.each(PRESETS.map((p) => [p.id, p] as const))('%s: pure, idle frame first, every step has panes and a caption', (_, p) => {
    const params = paramDefaults(p.code)
    const a = p.scenario(params)
    expect(JSON.stringify(p.scenario(params))).toBe(JSON.stringify(a))
    expect(a[0].activeLine).toBe(0)
    expect(a[0].domOps).toEqual([])
    expect(a.length).toBeGreaterThan(5)
    for (const s of a) {
      expect(s.caption.length).toBeGreaterThan(10)
      expect(s.data!.panes).toHaveLength(2)
      expect(s.data!.panes.filter((x) => x.role === 'current')).toHaveLength(1)
    }
  })
  it('fills params back into the code', () => {
    expect(fillParams('a ⟦1⟧ b ⟦2⟧', ['x'])).toBe('a ⟦x⟧ b ⟦2⟧')
  })
})
