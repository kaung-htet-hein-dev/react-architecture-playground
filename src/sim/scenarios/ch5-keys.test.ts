import { describe, expect, it } from 'vitest'
import { CH5_ITEMS, ch5Keys, nextItem, runSide, shuffled } from './ch5-keys'

const removeFirst = CH5_ITEMS.slice(1)

describe('ch5 keys: Remove first', () => {
  it('index keys: React renames rows 0 and 1, removes row 2: 3 DOM ops', () => {
    const r = runSide(CH5_ITEMS, removeFirst, 'index')
    expect(r.ops.map((o) => o.kind)).toEqual(['remove', 'setText', 'setText'])
    expect(r.log).toEqual([
      { key: '0', text: 'label Milk → Bread, keep input', tag: 'text' },
      { key: '1', text: 'label Bread → Eggs, keep input', tag: 'text' },
      { key: '2', text: 'not in the new list', tag: 'remove' },
    ])
    expect(r.wrong).toEqual(['0', '1'])
    expect(r.removed).toEqual([{ key: '2', label: 'Eggs', index: 2 }])
  })

  it('id keys: React removes the milk row only: 1 DOM op', () => {
    const r = runSide(CH5_ITEMS, removeFirst, 'id')
    expect(r.ops.map((o) => o.kind)).toEqual(['remove'])
    expect(r.log).toEqual([
      { key: 'milk', text: 'not in the new list', tag: 'remove' },
      { key: 'bread', text: 'matched, same props', tag: 'keep' },
      { key: 'eggs', text: 'matched, same props', tag: 'keep' },
    ])
    expect(r.wrong).toEqual([])
  })

  it('trace: idle → queued → reconcile → commit, with the error on the commit', () => {
    const steps = ch5Keys({ before: CH5_ITEMS, after: removeFirst, action: 'remove' })
    expect(steps).toHaveLength(4)
    expect(steps.map((s) => s.phase)).toEqual(['trigger', 'trigger', 'reconcile', 'commit'])
    expect(steps.map((s) => s.data?.stage)).toEqual(['before', 'queued', 'reconciled', 'committed'])
    expect(steps[3].status).toBe('error')
    expect(steps.slice(0, 3).every((s) => s.status === undefined)).toBe(true)
    expect(steps[3].domOps).toHaveLength(4)
    expect(steps[3].caption).toMatch(/^With index keys, React thinks you removed the last row/)
  })
})

describe('ch5 keys: Shuffle and Add item', () => {
  const order = [CH5_ITEMS[2], CH5_ITEMS[0], CH5_ITEMS[1]]

  it('shuffle by id moves rows; by index rewrites every label', () => {
    expect(runSide(CH5_ITEMS, order, 'id').ops.map((o) => o.kind)).toEqual(['move', 'move'])
    expect(runSide(CH5_ITEMS, order, 'id').log.map((l) => l.tag)).toEqual(['move', 'move', 'keep'])
    const idx = runSide(CH5_ITEMS, order, 'index')
    expect(idx.ops.map((o) => o.kind)).toEqual(['setText', 'setText', 'setText'])
    expect(idx.wrong).toEqual(['0', '1', '2'])
    expect(ch5Keys({ before: CH5_ITEMS, after: order, action: 'shuffle' })[3].status).toBe('error')
  })

  it('appending is fine with index keys: same writes on both sides, no error', () => {
    const add = nextItem(CH5_ITEMS)!
    expect(add).toEqual({ id: 'butter', label: 'Butter' })
    const after = [...CH5_ITEMS, add]
    const idx = runSide(CH5_ITEMS, after, 'index')
    const id = runSide(CH5_ITEMS, after, 'id')
    expect(idx.ops.map((o) => o.kind)).toEqual(id.ops.map((o) => o.kind))
    expect(idx.created).toEqual(['3'])
    expect(id.created).toEqual(['butter'])
    expect(idx.wrong).toEqual([])
    const steps = ch5Keys({ before: CH5_ITEMS, after, action: 'add' })
    expect(steps[3].status).toBeUndefined()
  })

  it('shuffled() never returns the same order', () => {
    expect(shuffled(CH5_ITEMS, () => 0.999).map((i) => i.id)).not.toEqual(CH5_ITEMS.map((i) => i.id))
    for (let s = 0; s < 20; s++) expect(shuffled(CH5_ITEMS)).not.toEqual(CH5_ITEMS)
  })
})
