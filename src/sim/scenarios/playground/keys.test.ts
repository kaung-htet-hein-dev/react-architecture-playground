import { describe, expect, it } from 'vitest'
import { keyByParam, keysTrace } from './keys'

describe('playground · index versus id keys', () => {
  it('key={index}: 3 DOM ops and typed text on the wrong rows', () => {
    const s = keysTrace(['index'])
    expect(s).toHaveLength(8)
    const last = s.at(-1)!
    expect(last.domOps.map((o) => o.kind)).toEqual(['remove', 'setText', 'setText'])
    expect(last.preview.values).toEqual({ labels: ['Bread', 'Eggs'], typed: ['2 litres', 'sourdough'], ok: ['0', '0'] })
  })
  it('key={item.id}: 1 DOM op and every row keeps its text', () => {
    const last = keysTrace(['item.id']).at(-1)!
    expect(last.domOps.map((o) => o.kind)).toEqual(['remove'])
    expect(last.preview.values).toEqual({ labels: ['Bread', 'Eggs'], typed: ['sourdough', 'a dozen'], ok: ['1', '1'] })
  })
  it('reads the key expression', () => {
    expect(keyByParam('index')).toBe('index')
    expect(keyByParam(' item.id ')).toBe('id')
    expect(keyByParam('item.label')).toBe('label')
    expect(keyByParam('whatever')).toBe('index')
  })
})
