import type { NodeState, TreeNode } from '../../sim/types'

/**
 * Tidy top-down tree layout, ported from design/Tree.dc.html. Leaves take consecutive
 * columns; each parent is centered over its first and last child. Edges are orthogonal:
 * `M px,py V mid H cx V cy`.
 */

export interface TreeLayoutOptions {
  /** Column width; default 104 (76 compact). */
  colWidth?: number
  compact?: boolean
}

export interface PlacedNode {
  node: TreeNode
  /** 0 for roots */
  depth: number
  /** Column position (leaves are integers, parents may be .5) */
  col: number
  /** Chip center x */
  cx: number
  left: number
  top: number
  width: number
}

export interface PlacedEdge {
  /** Child id (the edge into this node) */
  id: string
  d: string
  /** The child's state: edges take the child's color. */
  state: NodeState
}

export interface TreeLayout {
  width: number
  height: number
  chipHeight: number
  rowHeight: number
  fontSize: number
  colWidth: number
  /** Same order as the input nodes. */
  nodes: PlacedNode[]
  edges: PlacedEdge[]
}

interface Work {
  node: TreeNode
  kids: Work[]
  depth: number
  col: number
}

export function layoutTree(list: readonly TreeNode[], opts: TreeLayoutOptions = {}): TreeLayout {
  const compact = !!opts.compact
  const colWidth = opts.colWidth ?? (compact ? 76 : 104)
  const rowHeight = compact ? 50 : 62
  const chipHeight = compact ? 26 : 30
  const fontSize = compact ? 11 : 12

  const map = new Map<string, Work>()
  list.forEach((n) => map.set(n.id, { node: n, kids: [], depth: 0, col: 0 }))
  const roots: Work[] = []
  list.forEach((n) => {
    const w = map.get(n.id)!
    const parent = n.parent ? map.get(n.parent) : undefined
    if (parent) parent.kids.push(w)
    else roots.push(w)
  })

  let leaf = 0
  let maxDepth = 0
  const place = (w: Work, d: number) => {
    w.depth = d
    maxDepth = Math.max(maxDepth, d)
    if (!w.kids.length) w.col = leaf++
    else {
      w.kids.forEach((k) => place(k, d + 1))
      w.col = (w.kids[0].col + w.kids[w.kids.length - 1].col) / 2
    }
  }
  roots.forEach((r) => place(r, 0))

  const width = Math.max(leaf, 1) * colWidth
  const height = maxDepth * rowHeight + chipHeight + 14
  const chipWidth = colWidth - 12
  const pos = (w: Work) => ({ cx: w.col * colWidth + colWidth / 2, top: 10 + w.depth * rowHeight })

  const nodes: PlacedNode[] = []
  const edges: PlacedEdge[] = []
  list.forEach((n) => {
    const w = map.get(n.id)!
    const { cx, top } = pos(w)
    nodes.push({ node: n, depth: w.depth, col: w.col, cx, left: cx - chipWidth / 2, top, width: chipWidth })
    const parent = n.parent ? map.get(n.parent) : undefined
    if (parent) {
      const pp = pos(parent)
      const y1 = pp.top + chipHeight
      const y2 = top
      const ym = (y1 + y2) / 2
      edges.push({ id: n.id, d: `M${pp.cx} ${y1} V${ym} H${cx} V${y2}`, state: n.state ?? 'idle' })
    }
  })

  return { width, height, chipHeight, rowHeight, fontSize, colWidth, nodes, edges }
}

/** Node states that take part in a pass and get an order badge when none is given. */
const ORDERED_STATES: ReadonlySet<NodeState> = new Set(['render', 'reconcile', 'dom', 'error'])

/**
 * Order badges for reduced motion when a trace doesn't number its nodes: the nodes in an
 * active state (render, reconcile, dom, error), numbered depth-first in child order, which
 * is the order React walks the tree. Traces that set `order` on any node are left as they are.
 */
export function withDerivedOrder(nodes: readonly TreeNode[]): readonly TreeNode[] {
  if (nodes.some((n) => n.order != null)) return nodes
  const ids = new Set(nodes.map((n) => n.id))
  const kids = new Map<string | undefined, TreeNode[]>()
  for (const n of nodes) {
    const p = n.parent && ids.has(n.parent) ? n.parent : undefined
    kids.set(p, [...(kids.get(p) ?? []), n])
  }
  const order = new Map<string, number>()
  const visit = (n: TreeNode) => {
    if (ORDERED_STATES.has(n.state ?? 'idle')) order.set(n.id, order.size + 1)
    for (const c of kids.get(n.id) ?? []) visit(c)
  }
  for (const r of kids.get(undefined) ?? []) visit(r)
  if (!order.size) return nodes
  return nodes.map((n) => (order.has(n.id) ? { ...n, order: order.get(n.id) } : n))
}
