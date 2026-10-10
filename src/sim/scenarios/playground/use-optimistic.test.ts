import { describe, expect, it } from 'vitest'
import { useOptimisticTrace } from './use-optimistic'

describe('playground · optimistic update with useOptimistic', () => {
  it('shows the message at once, then rolls it back when the server rejects it', () => {
    const s = useOptimisticTrace(['false', "'See you'"])
    expect(s[6].preview.values.shown).toEqual(['Hi!', 'See you · sending'])
    expect(s.at(-1)!.preview.values).toEqual({ shown: ['Hi!'], error: 'Not sent' })
    expect(s.at(-1)!.queue![0].result).toBe('dropped · cleared')
  })
  it('replaces the optimistic entry with the real one when the server accepts it', () => {
    const s = useOptimisticTrace(['true', "'Bye'"])
    expect(s[6].preview.values.shown).toEqual(['Hi!', 'Bye · sending'])
    expect(s.at(-1)!.preview.values).toEqual({ shown: ['Hi!', 'Bye'], error: '' })
  })
  it('the optimistic update is SyncLane, the real state TransitionLane', () => {
    const s = useOptimisticTrace(['true', "'Bye'"])
    expect(s.at(-1)!.queue!.map((u) => u.lane)).toEqual(['SyncLane', 'TransitionLane'])
  })
})
