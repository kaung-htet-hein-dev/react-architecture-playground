import { describe, expect, it } from 'vitest'
import { ch3Objects, CH3_COUNT_LINE, counterElement } from './ch3-elements'

/** The objects pane from design/Render Commit Repeat.dc.html `ch3()`. */
const design = (c: number) =>
  '// Counter({ count: ' +
  c +
  " }) returns:\n{\n  $$typeof: Symbol.for('react.transitional.element'),\n  type: 'div',\n  props: {\n    children: [\n      { type: 'button', props: { children: '+1' } },\n      { type: 'p', props: { children: ['Count: ', " +
  c +
  '] } },\n    ],\n  },\n}'

describe('ch3 elements', () => {
  it('prints the element tree exactly like the design, for any count', () => {
    for (const c of [-2, 0, 3, 10]) expect(ch3Objects(c)).toBe(design(c))
  })

  it('count sits on the noted line', () => {
    expect(ch3Objects(7).split('\n')[CH3_COUNT_LINE - 1]).toContain(', 7]')
  })

  it('a render is plain objects: same input, same output', () => {
    expect(counterElement(4)).toEqual(counterElement(4))
    expect(counterElement(4)).not.toEqual(counterElement(5))
  })
})
