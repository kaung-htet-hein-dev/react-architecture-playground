import { describe, expect, it } from 'vitest'
import { conditionalHookTrace } from './conditional-hook'

describe('playground · conditional hook error', () => {
  it('true → false: warns about hook order, then errors on line 16', () => {
    const s = conditionalHookTrace(['true'])
    const errAt = s.findIndex((x) => x.status === 'error')
    expect(errAt).toBe(s.length - 1)
    const last = s[errAt]
    expect(last.errorLine).toBe(16)
    expect(last.preview.error?.message).toMatch(/^Should have a queue/)
    expect(last.data!.panes[1].tree.find((n) => n.id === 'profile')?.state).toBe('error')
    expect(last.console!.filter((c) => c.level === 'warn')[0].text).toBe('React has detected a change in the order of Hooks called by Profile.')
    expect(last.domOps).toEqual([])
    expect(s[4].dimLines).toEqual([13, 14, 15])
  })
  it('false → true: one hook too many', () => {
    const last = conditionalHookTrace(['false']).at(-1)!
    expect(last.status).toBe('error')
    expect(last.preview.error?.message).toBe('Rendered more hooks than during the previous render.')
  })
})
