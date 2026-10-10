import { describe, expect, it } from 'vitest'
import { ch2Approaches, CH2_INITIAL, CH2_NEW_TODO } from './ch2-todo'

describe('ch2 todo, three ways', () => {
  const r = ch2Approaches()

  it('every approach makes the same 4 DOM writes to add one item', () => {
    expect(r.vanilla.ops).toHaveLength(4)
    expect(r.react.ops).toHaveLength(4)
    expect(r.fineGrained.ops).toHaveLength(4)
  })

  it('the writes are: create the <li>, set its text, append it, update the label', () => {
    for (const res of Object.values(r)) {
      const kinds = res.ops.map((o) => o.kind)
      expect(kinds.filter((k) => k === 'createElement')).toHaveLength(1)
      expect(kinds.filter((k) => k === 'append')).toHaveLength(1)
      expect(kinds.filter((k) => k === 'setText')).toHaveLength(2)
      expect(res.ops.some((o) => o.value === CH2_NEW_TODO)).toBe(true)
      expect(res.ops.some((o) => o.value === '2' || o.value === '2 left')).toBe(true)
    }
  })

  it('all three end with the same page', () => {
    const expected = `<ul>${[...CH2_INITIAL.map((t) => t.text), CH2_NEW_TODO].map((t) => `<li>${t}</li>`).join('')}</ul><p>2 left</p>`
    expect(r.vanilla.html).toBe(expected)
    expect(r.react.html).toBe(expected)
    expect(r.fineGrained.html).toBe(expected)
  })
})
