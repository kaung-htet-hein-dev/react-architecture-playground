import { describe, expect, it } from 'vitest'
import { ch7Code, ch7Effects, DEPS_OPTIONS, effectMatrix, parseDeps, runCh7, UPDATE_OPTIONS } from './ch7-effects'

describe('ch7 effects: "Does the useEffect run?" matrix', () => {
  it('matches React effect semantics for every deps × update', () => {
    // rows: no array, [], [count], [count, user] · columns: mount, count changes, user changes
    expect(effectMatrix()).toEqual([
      [true, true, true],
      [true, false, false],
      [true, true, false],
      [true, true, true],
    ])
  })

  it('a custom array follows Object.is per dependency', () => {
    expect(runCh7(['user'], 'count').passiveRan).toBe(false)
    expect(runCh7(['user'], 'user').passiveRan).toBe(true)
  })

  it('cleans up the previous effect before re-running, and only on updates', () => {
    expect(runCh7(['count'], 'count')).toMatchObject({ passiveRan: true, passiveCleanup: true })
    expect(runCh7(['count'], 'mount')).toMatchObject({ passiveRan: true, passiveCleanup: false })
    expect(runCh7([], 'user')).toMatchObject({ passiveRan: false, passiveCleanup: false })
  })

  it('orders commit → layout effects → paint → passive effects', () => {
    const { events } = runCh7(null, 'count')
    const idx = (pred: (e: (typeof events)[number]) => boolean) => events.findIndex(pred)
    const dom = idx((e) => e.type === 'dom')
    const paint = idx((e) => e.type === 'paint')
    const passive = idx((e) => e.type === 'effect' && e.tag === 'passive' && e.action === 'run')
    const cleanup = idx((e) => e.type === 'effect' && e.tag === 'passive' && e.action === 'cleanup')
    expect(dom).toBeGreaterThan(-1)
    expect(dom).toBeLessThan(paint)
    expect(paint).toBeLessThan(cleanup)
    expect(cleanup).toBeLessThan(passive)
  })

  it('the layout effect with [] runs on mount only', () => {
    expect(runCh7(null, 'mount').layoutRan).toBe(true)
    for (const u of UPDATE_OPTIONS.slice(1)) expect(runCh7(null, u.value).layoutRan).toBe(false)
  })
})

describe('ch7 trace', () => {
  it('has an idle frame and 5 steps, one DOM op for a count change', () => {
    const steps = ch7Effects({ deps: ['count'], upd: 'count' })
    expect(steps).toHaveLength(6)
    expect(steps.at(-1)!.domOps).toHaveLength(1)
    expect(steps.at(-1)!.domOps[0].value).toBe('1')
    expect(steps.at(-1)!.activeLine).toBe(9)
    expect(steps.at(-1)!.data!.blocks.map((b) => b.on)).toEqual([true, true, false, true, true])
  })

  it('a skipped effect points at the deps line', () => {
    const steps = ch7Effects({ deps: [], upd: 'count' })
    expect(steps.at(-1)!.activeLine).toBe(11)
    expect(steps.at(-1)!.data!.blocks[4]).toMatchObject({ on: false, text: 'skipped · deps unchanged' })
  })

  it('parses typed deps and renders them into the code', () => {
    expect(parseDeps('[count, user]')).toEqual(['count', 'user'])
    expect(parseDeps(' [ ] ')).toEqual([])
    expect(parseDeps('/* no array */')).toBeNull()
    expect(parseDeps('[count, foo]')).toBeUndefined()
    expect(parseDeps('[count, count]')).toBeUndefined()
    for (const d of DEPS_OPTIONS) expect(parseDeps(d.label)).toEqual(d.deps)
    expect(ch7Code(['count'])).toContain('}, ⟦[count]⟧);')
    expect(ch7Code(null)).toContain('}⟦/* no array */⟧);')
  })
})
