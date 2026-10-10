import { describe, expect, it } from 'vitest'
import { CH1_CODE, CH1_ERROR_CODE, ch1Counter } from './ch1-counter'

describe('ch1 counter', () => {
  const steps = ch1Counter({ variant: 'ok' })

  it('has an idle frame and 7 steps', () => {
    expect(steps).toHaveLength(8)
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'trigger', 'trigger', 'render', 'render', 'reconcile', 'commit', 'paint'])
    expect(steps.map((s) => s.activeLine)).toEqual([0, 6, 6, 2, 7, 7, 7, 0])
  })

  it('idle frame: count 0, empty log, no DOM ops', () => {
    const idle = steps[0]
    expect(idle.preview.values.count).toBe('0')
    expect(idle.log).toEqual([])
    expect(idle.domOps).toEqual([])
    expect(idle.code).toBe(CH1_CODE)
    expect(idle.tree.map((n) => `${n.label}<${n.parent ?? ''}`)).toEqual(['App<', 'Header<app', 'Counter<app', 'div<counter', 'button<div', 'p<div'])
  })

  it('logs the design rows in order', () => {
    expect(steps[7].log.map((r) => r.text)).toEqual([
      'click on <button> → onClick()',
      'setCount(1) → queue update on Counter',
      'call Counter() → count is 1',
      'returns <div> with <button> and <p>',
      'diff <p>: "Count: 0" → "Count: 1"',
      'p.firstChild.nodeValue = "1"',
      'browser paints the frame',
    ])
    expect(steps[7].log.map((r) => r.tone)).toEqual(['trigger', 'trigger', 'render', 'render', 'reconcile', 'commit', 'paint'])
  })

  it('commits exactly one DOM op, at step 6', () => {
    expect(steps[5].domOps).toHaveLength(0)
    expect(steps[6].domOps).toHaveLength(1)
    expect(steps[6].domOps[0]).toMatchObject({ kind: 'setText', nodeId: 'p', value: '1' })
    expect(steps[7].domOps).toHaveLength(1)
    expect(steps[6].preview).toEqual({ values: { count: '1' }, highlight: ['count'] })
    expect(steps[7].preview.values.count).toBe('1')
  })

  it('running frame (step 6) matches the design', () => {
    const s = steps[6]
    expect(s.notes).toEqual({ 7: '← text changes here' })
    expect(s.treeNote).toBe('1 rendered · 1 DOM change')
    expect(s.timeline?.playhead).toBe(44)
    const byId = Object.fromEntries(s.tree.map((n) => [n.id, n]))
    expect(byId.counter).toMatchObject({ state: 'render', tag: 'state', order: 1 })
    expect(byId.p).toMatchObject({ state: 'dom', order: 4 })
    expect(byId.header.state).toBeUndefined()
  })

  it('error variant: line 6, Counter "render ×25", Too many re-renders', () => {
    const err = ch1Counter({ variant: 'error' })
    expect(err).toHaveLength(5)
    expect(err[0].code).toBe(CH1_ERROR_CODE)
    const last = err[err.length - 1]
    expect(err.findIndex((s) => s.status === 'error')).toBe(4)
    expect(last.errorLine).toBe(6)
    expect(last.tree.find((n) => n.id === 'counter')).toMatchObject({ state: 'error', tag: 'render ×25' })
    expect(last.preview.error?.message).toMatch(/^Too many re-renders\./)
    expect(last.domOps).toEqual([])
    expect(last.log.map((r) => r.text)).toEqual([
      'call Counter() → runs setCount(1) now',
      'update queued during render → render again',
      '… 23 more renders, no commit',
      'Error: Too many re-renders.',
    ])
  })
})
