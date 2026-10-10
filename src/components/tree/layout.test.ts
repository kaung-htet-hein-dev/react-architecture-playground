import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../sim/types'
import { layoutTree, withDerivedOrder } from './layout'

const ch1: TreeNode[] = [
  { id: 'app', label: 'App' },
  { id: 'header', label: 'Header', parent: 'app' },
  { id: 'counter', label: 'Counter', parent: 'app', state: 'render' },
  { id: 'div', label: 'div', parent: 'counter' },
  { id: 'button', label: 'button', parent: 'div' },
  { id: 'p', label: 'p', parent: 'div', state: 'dom' },
]

const byId = (l: ReturnType<typeof layoutTree>, id: string) => l.nodes.find((n) => n.node.id === id)!

describe('layoutTree', () => {
  it('puts leaves in consecutive columns and centers parents over their children', () => {
    const l = layoutTree(ch1)
    expect(byId(l, 'header').col).toBe(0)
    expect(byId(l, 'button').col).toBe(1)
    expect(byId(l, 'p').col).toBe(2)
    expect(byId(l, 'div').col).toBe(1.5)
    expect(byId(l, 'counter').col).toBe(1.5)
    expect(byId(l, 'app').col).toBe(0.75)
  })

  it('sizes the canvas from leaves and depth (default 104 / 62 / 30)', () => {
    const l = layoutTree(ch1)
    expect(l.width).toBe(3 * 104)
    expect(l.height).toBe(3 * 62 + 30 + 14)
    const p = byId(l, 'p')
    expect(p).toMatchObject({ depth: 3, cx: 2 * 104 + 52, top: 10 + 3 * 62, width: 92, left: 260 - 46 })
  })

  it('uses compact metrics and a custom column width', () => {
    const l = layoutTree(ch1, { compact: true })
    expect(l).toMatchObject({ colWidth: 76, rowHeight: 50, chipHeight: 26, fontSize: 11 })
    expect(layoutTree(ch1, { colWidth: 96 }).width).toBe(288)
  })

  it('draws orthogonal edges from parent bottom to child top, colored by the child', () => {
    const l = layoutTree(ch1)
    const e = l.edges.find((x) => x.id === 'p')!
    // div at col 1.5 (cx 208, top 134) → p at col 2 (cx 260, top 196)
    expect(e.d).toBe('M208 164 V180 H260 V196')
    expect(e.state).toBe('dom')
    expect(l.edges).toHaveLength(5)
    expect(l.edges.find((x) => x.id === 'header')!.state).toBe('idle')
  })

  it('treats nodes with unknown parents as extra roots', () => {
    const l = layoutTree([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', parent: 'missing' },
    ])
    expect(l.nodes.map((n) => [n.col, n.depth])).toEqual([
      [0, 0],
      [1, 0],
    ])
    expect(l.edges).toHaveLength(0)
    expect(l.height).toBe(30 + 14)
  })

  it('handles an empty tree', () => {
    const l = layoutTree([])
    expect(l.width).toBe(104)
    expect(l.nodes).toEqual([])
  })
})

describe('withDerivedOrder', () => {
  it('numbers active nodes depth-first when the trace gives no order', () => {
    const tree: TreeNode[] = [
      { id: 'app', label: 'App' },
      { id: 'a', label: 'A', parent: 'app', state: 'render' },
      { id: 'a1', label: 'a1', parent: 'a', state: 'dom' },
      { id: 'b', label: 'B', parent: 'app', state: 'render' },
      { id: 'b1', label: 'b1', parent: 'b', state: 'skip' },
    ]
    const order = Object.fromEntries(withDerivedOrder(tree).map((n) => [n.id, n.order]))
    expect(order).toEqual({ app: undefined, a: 1, a1: 2, b: 3, b1: undefined })
  })

  it('keeps an order the trace already set', () => {
    const tree: TreeNode[] = [
      { id: 'app', label: 'App', state: 'render' },
      { id: 'p', label: 'p', parent: 'app', state: 'dom', order: 4 },
    ]
    expect(withDerivedOrder(tree)).toBe(tree)
  })
})
