import { describe, expect, it } from 'vitest'
import { batchingRenders, ch8Concurrent, droppedFrames, FRAME_COUNT, laneInterrupt, simulateTyping, SPAN_MS } from './ch8-concurrent'

describe('ch8 typing "react": blocking vs useTransition', () => {
  const blocking = simulateTyping('blocking')
  const transition = simulateTyping('transition')

  it('blocking renders the whole list for every keystroke, so later keys wait', () => {
    const renders = blocking.blocks.filter((b) => b.kind === 'render')
    expect(renders).toHaveLength(5)
    expect(renders[0].end - renders[0].start).toBeGreaterThan(170)
    expect(blocking.blocks.filter((b) => b.kind === 'key' && b.waited).map((b) => b.label)).toEqual(['e', 'a', 'c', 't'])
    expect(blocking.interrupts).toBe(0)
  })

  it('blocking drops most frames; the transition drops none', () => {
    const dropB = droppedFrames(blocking.tasks).filter(Boolean).length
    const dropT = droppedFrames(transition.tasks).filter(Boolean).length
    expect(dropB).toBeGreaterThanOrEqual(13)
    expect(dropT).toBe(0)
  })

  it('the transition updates the input at once, throws away 4 renders and commits the list once', () => {
    expect(transition.input.map((s) => s.value)).toEqual(['', 'r', 're', 'rea', 'reac', 'react'])
    expect(transition.input[1].t).toBeLessThan(15)
    expect(transition.interrupts).toBe(4)
    expect(transition.blocks.some((b) => b.kind === 'gone')).toBe(true)
    expect(transition.list.map((s) => s.value)).toEqual(['', 'react'])
    const commit = transition.blocks.filter((b) => b.kind === 'commit')
    expect(commit).toHaveLength(1)
    expect(commit[0].end).toBeLessThan(SPAN_MS)
    expect(transition.pending).toHaveLength(1)
  })

  it('the trace has an idle frame, one step per letter and the final commit', () => {
    const steps = ch8Concurrent({})
    expect(steps).toHaveLength(7)
    const last = steps.at(-1)!.data!
    expect(last.transition.input).toBe('react')
    expect(last.transition.list).toBe('react')
    expect(last.transition.pending).toBe(false)
    expect(last.blocking.input).toBe('r')
    expect(last.blocking.frames).toHaveLength(FRAME_COUNT)
    expect(steps[3].data!.transition.pending).toBe(true)
    expect(steps[3].data!.typed).toBe('rea')
  })
})

describe('ch8 cards', () => {
  it('a keystroke interrupts the transition lane, which restarts from scratch', () => {
    const card = laneInterrupt()
    expect(card.thrownAway).toBe(5)
    expect(card.restarted).toBe(6)
    expect(card.sync.map((b) => b.kind)).toEqual(['key', 'urgent'])
    expect(card.lane.at(-1)!.kind).toBe('commit')
    expect(card.lane.filter((b) => b.kind === 'gone')).toHaveLength(5)
  })

  it('automatic batching: 3 renders in React 17, 1 in React 18+', () => {
    expect(batchingRenders(17)).toBe(3)
    expect(batchingRenders(18)).toBe(1)
  })
})
