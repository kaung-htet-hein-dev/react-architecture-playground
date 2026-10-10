import { describe, expect, it } from 'vitest'
import { paramDefaults } from './shared'
import { THREE_SETSTATE_CODE, threeSetStateTrace } from './three-setstate'

const steps = threeSetStateTrace(paramDefaults(THREE_SETSTATE_CODE))
const roles = (i: number) => steps[i].data!.panes.map((p) => p.role).join('/')

describe('playground · three setState calls (design/Playground.dc.html)', () => {
  it('has the idle frame and 11 steps with the design phases and lines', () => {
    expect(paramDefaults(THREE_SETSTATE_CODE)).toEqual(['0', '1', '1', '1'])
    expect(steps).toHaveLength(12)
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'trigger', 'trigger', 'trigger', 'trigger', 'trigger', 'render', 'render', 'reconcile', 'commit', 'commit', 'commit'])
    expect(steps.map((s) => s.activeLine)).toEqual([0, 14, 9, 10, 11, 12, 2, 14, 14, 14, 0, 5])
    expect(steps.map((s) => s.timeline!.playhead)).toEqual([10, 18.5, 19.3, 20.1, 20.9, 21.2, 23, 24.6, 26.2, 28.2, 31.5, 35])
  })

  it('queues three updates one by one, applies them as 1, 1, 2 and clears them at commit', () => {
    expect(steps.slice(1, 5).map((s) => s.queue!.length)).toEqual([0, 1, 2, 3])
    expect(steps[4].queue!.map((u) => u.text)).toEqual(['setCount(0 + 1)', 'setCount(0 + 1)', 'setCount(c => c + 1)'])
    expect(steps[4].queue!.every((u) => u.lane === 'SyncLane')).toBe(true)
    expect(steps[6].queue!.map((u) => u.result)).toEqual(['applied → 1', 'applied → 1', 'applied → 2'])
    expect(steps[9].queue!.every((u) => u.result === 'applied · cleared')).toBe(true)
    expect(steps[6].notes).toEqual({ 2: '← count = 2' })
  })

  it('ends with count 2 and exactly one DOM op, written at the commit step', () => {
    expect(steps[8].domOps).toHaveLength(0)
    expect(steps[9].domOps).toHaveLength(1)
    expect(steps[9].domOps[0]).toMatchObject({ kind: 'setText', value: '2', text: 'text.nodeValue = "Count: 2"' })
    expect(steps[11].domOps).toHaveLength(1)
    expect(steps[11].preview.values.count).toBe('2')
    expect(steps[8].preview.values.count).toBe('0')
  })

  it('swaps the trees at the commit step (9), not before', () => {
    expect(roles(5)).toBe('current/empty')
    expect(roles(6)).toBe('current/wip')
    expect(roles(8)).toBe('current/wip')
    expect(roles(9)).toBe('alternate/current')
    expect(steps[8].data!.swapBanner).toBe(false)
    expect(steps.slice(9).every((s) => s.data!.swapBanner && s.rootCurrent === 'wip')).toBe(true)
  })

  it('runs the title effect after paint, at the last step', () => {
    const paint = steps.findIndex((s) => s.console!.some((c) => c.tag === '[paint]'))
    const effect = steps.findIndex((s) => s.console!.some((c) => c.tag === '[effect]'))
    expect(paint).toBe(10)
    expect(effect).toBe(11)
    expect(steps[10].preview.tabTitle).toBe('Clicked 0 times')
    expect(steps[11].preview.tabTitle).toBe('Clicked 2 times')
    expect(steps[11].effects![0]).toMatchObject({ status: 'ran', detail: 'ran after paint' })
    expect(steps[11].console!.map((c) => c.tag)).toEqual(['[event]', '[schedule]', '[render]', '[reconcile]', '[commit]', '[paint]', '[effect]'])
  })

  it('regenerates from the editable params', () => {
    const s = threeSetStateTrace(['5', '2', '2', '10'])
    expect(s.at(-1)!.preview.values.count).toBe('17')
    expect(s.at(-1)!.preview.tabTitle).toBe('Clicked 17 times')
  })

  it('bails out without rendering when every update keeps the same state', () => {
    const s = threeSetStateTrace(['0', '0', '0', '0'])
    expect(s).toHaveLength(6)
    expect(s.at(-1)!.domOps).toHaveLength(0)
    expect(s.every((x) => x.data!.panes[1].role === 'empty')).toBe(true)
  })
})

describe('three setState calls · design copy', () => {
  it('uses the design captions verbatim with the default params', () => {
    const s = threeSetStateTrace(['0', '1', '1', '1'])
    expect(s[6].caption).toBe('React calls Counter again. useState works through the queue in order: 1, then 1 again, then the updater adds one. This render sees count = 2.')
    expect(s[9].caption).toBe('Commit. React writes the one change to the real DOM, then points root.current at the work-in-progress tree. The two trees have swapped roles.')
    expect(s[11].caption).toBe('After paint, React runs passive effects whose dependencies changed. count went from 0 to 2, so the title effect runs.')
  })
})
