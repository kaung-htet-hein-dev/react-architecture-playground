import { describe, expect, it } from 'vitest'
import { CH6_ERROR, ch6Hooks } from './ch6-hooks'

describe('ch6 hooks scenario', () => {
  const steps = ch6Hooks({})

  it('has an idle frame and 6 steps, ending in the error', () => {
    expect(steps).toHaveLength(7)
    expect(steps.findIndex((s) => s.status === 'error')).toBe(6)
    expect(steps[6].errorLine).toBe(6)
    expect(steps[6].dimLines).toEqual([3, 4, 5])
  })

  it('render 1 maps three calls to three slots read from the fiber', () => {
    const r1 = steps[3].data!.render1
    expect(r1.map((s) => s.call)).toEqual(["useState('Ada')", 'useEffect(…, [])', "useState('dark')"])
    expect(r1.map((s) => s.slot)).toEqual(["slot 0 · state 'Ada'", 'slot 1 · effect, deps []', "slot 2 · state 'dark'"])
    expect(steps[3].data!.chain).toBe('→ slot 0 → slot 1 → slot 2')
  })

  it('render 2: slot 0 matches, slot 1 is read by the wrong hook, slot 2 is never read', () => {
    const r2 = steps[6].data!.render2
    expect(r2.map((s) => s.status)).toEqual(['ok', 'error', 'unread'])
    expect(r2[1]).toMatchObject({ call: "useState('dark')", slot: 'slot 1 · holds an effect ✕' })
    expect(r2[2].call).toBeNull()
  })

  it('reports the hook-order table and the error from the model', () => {
    const d = steps[6].data!
    expect(d.warning).toEqual({ previous: ['useState', 'useEffect', 'useState'], next: ['useState', 'useState', 'undefined'] })
    expect(d.error).toBe(CH6_ERROR)
    expect(d.modelError).toMatch(/Should have a queue/)
    expect(steps[6].console).toHaveLength(2)
    expect(steps[6].domOps).toHaveLength(0)
  })
})
