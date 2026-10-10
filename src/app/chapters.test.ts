import { describe, expect, it } from 'vitest'
import { PHASES } from '../sim/types'
import { loopPhasesFor } from './chapters'

describe('loopPhasesFor (R-G4)', () => {
  it('follows the hero simulation on chapter 1', () => {
    expect(loopPhasesFor(1, ['commit'])).toEqual(['commit'])
    expect(loopPhasesFor(1, [])).toEqual([])
  })

  it('lights the fixed phases of chapters 2–10, whatever the hero is doing', () => {
    const hero = ['render', 'reconcile'] as const
    expect(loopPhasesFor(2, hero)).toEqual(['render'])
    expect(loopPhasesFor(3, hero)).toEqual(['render'])
    expect(loopPhasesFor(4, hero)).toEqual(['render'])
    expect(loopPhasesFor(5, hero)).toEqual(['reconcile'])
    expect(loopPhasesFor(6, hero)).toEqual(['render'])
    expect(loopPhasesFor(7, hero)).toEqual(['commit'])
    expect(loopPhasesFor(8, hero)).toEqual(['trigger', 'render'])
    expect(loopPhasesFor(9, hero)).toEqual(PHASES)
    expect(loopPhasesFor(10, hero)).toEqual(PHASES)
  })
})
