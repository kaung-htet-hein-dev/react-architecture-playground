import type { DomOp } from '../types'
import { domInsert, domRemove, type DomNode } from './dom'
import type { ModelEvent } from './events'
import { runEffectBodies, runEffectCleanups, runFiberUnmountCleanups } from './effects'
import { LayoutEffect, LayoutMask, MutationMask, Placement, Update, type Fiber } from './fiber'
import { rt } from './runtime'

type Emit = (e: ModelEvent) => void

const q = (v: string) => JSON.stringify(v)

/** Text nodes are not tree nodes: their writes are attributed to the host element that holds them. */
function treeNodeId(f: Fiber): string {
  if (f.tag !== 'text') return f.id
  for (let p = f.return; p; p = p.return) if (p.tag === 'host') return p.id
  return f.id
}

function op(emit: Emit, f: Fiber, o: DomOp) {
  emit({ type: 'dom', fiberId: f.id, op: { ...o, nodeId: o.nodeId ?? treeNodeId(f), ...(f.key != null ? { key: f.key } : {}) } })
}

const isHost = (f: Fiber) => f.tag === 'host' || f.tag === 'text'

function hostParent(f: Fiber, container: DomNode): DomNode {
  for (let p = f.return; p; p = p.return) {
    if (p.tag === 'host') return p.stateNode!
    if (p.tag === 'root') return container
  }
  return container
}

/**
 * React's getHostSibling: the DOM node to insert before, found by walking to the next sibling
 * fibers (descending through components) and skipping ones that are being placed themselves.
 */
function hostSibling(f: Fiber): DomNode | null {
  let node: Fiber = f
  for (;;) {
    while (node.sibling === null) {
      if (node.return === null || isHost(node.return) || node.return.tag === 'root') return null
      node = node.return
    }
    node = node.sibling
    let found = true
    while (!isHost(node)) {
      if (node.flags & Placement || node.child === null) {
        found = false
        break
      }
      node = node.child
    }
    if (found && !(node.flags & Placement)) return node.stateNode
  }
}

const childLabel = (parent: DomNode, node: DomNode) => {
  const i = parent.children.indexOf(node)
  return i === 0 ? `${parent.label}.firstChild` : `${parent.label}.childNodes[${i}]`
}

/** Ops that build a detached subtree before it is inserted (React does this in completeWork). */
function creationOps(f: Fiber, emit: Emit) {
  if (f.tag === 'text') {
    op(emit, f, { kind: 'createText', target: '#text', text: `document.createTextNode(${q(f.stateNode!.text ?? '')})`, value: f.stateNode!.text ?? '' })
    return
  }
  if (f.tag === 'host') {
    const n = f.stateNode!
    op(emit, f, { kind: 'createElement', target: n.label, text: `document.createElement(${q(n.tag)})` })
    for (const [k, v] of Object.entries(n.attrs)) {
      op(emit, f, { kind: 'setAttribute', target: n.label, text: `${n.label}.${k} = ${q(v)}`, value: v })
    }
    if (n.text != null) op(emit, f, { kind: 'setText', target: n.label, text: `${n.label}.textContent = ${q(n.text)}`, value: n.text })
  }
  for (let c = f.child; c; c = c.sibling) creationOps(c, emit)
}

function insertHostNodes(f: Fiber, parent: DomNode, before: DomNode | null, moved: boolean, emit: Emit) {
  if (isHost(f)) {
    const n = f.stateNode!
    if (!moved) creationOps(f, emit)
    domInsert(parent, n, before)
    const kind = moved ? 'move' : before ? 'insert' : 'append'
    const text = before ? `${parent.label}.insertBefore(${n.label}, ${before.label})` : `${parent.label}.appendChild(${n.label})`
    op(emit, f, { kind, target: n.label, text })
    return
  }
  for (let c = f.child; c; c = c.sibling) insertHostNodes(c, parent, before, moved, emit)
}

function commitPlacement(f: Fiber, container: DomNode, emit: Emit) {
  const parent = hostParent(f, container)
  const before = hostSibling(f)
  insertHostNodes(f, parent, before, f.alternate !== null, emit)
}

/** Remove a deleted subtree: layout cleanups (parents first), and removeChild for its top host nodes. */
function commitDeletion(deleted: Fiber, container: DomNode, emit: Emit) {
  const parent = hostParent(deleted, container)
  const visit = (f: Fiber, removeHosts: boolean) => {
    runFiberUnmountCleanups(f, 'layout', 'mutation', emit)
    for (let c = f.child; c; c = c.sibling) visit(c, removeHosts && !isHost(f))
    if (isHost(f) && removeHosts) {
      const n = f.stateNode!
      const host = n.parent ?? parent
      op(emit, f, { kind: 'remove', target: n.label, text: `${host.label}.removeChild(${n.label})` })
      domRemove(n)
    }
  }
  visit(deleted, true)
}

function commitUpdate(f: Fiber, emit: Emit) {
  const n = f.stateNode!
  for (const ch of f.updatePayload ?? []) {
    if (f.tag === 'text') {
      const label = n.parent ? childLabel(n.parent, n) : '#text'
      n.text = ch.next ?? ''
      op(emit, f, { kind: 'setText', target: label, text: `${label}.nodeValue = ${q(n.text)}`, value: n.text, prev: ch.prev })
    } else if (ch.name === 'textContent') {
      n.text = ch.next ?? ''
      op(emit, f, { kind: 'setText', target: n.label, text: `${n.label}.textContent = ${q(n.text)}`, value: n.text, prev: ch.prev })
    } else if (ch.next === undefined) {
      delete n.attrs[ch.name]
      op(emit, f, { kind: 'removeAttribute', target: n.label, text: `${n.label}.removeAttribute(${q(ch.name)})`, prev: ch.prev })
    } else {
      n.attrs[ch.name] = ch.next
      const kind = ch.name.startsWith('style.') ? 'setStyle' : 'setAttribute'
      op(emit, f, { kind, target: n.label, text: `${n.label}.${ch.name} = ${q(ch.next)}`, value: ch.next, prev: ch.prev })
    }
  }
  f.updatePayload = null
}

/**
 * Mutation phase (React's commitMutationEffects): children before parents. For each fiber:
 * its deletions (layout cleanups, then removeChild), its children, its own placement, then its
 * updates (layout-effect cleanups for components, attribute/text writes for hosts).
 */
export function commitMutationEffects(f: Fiber, container: DomNode, emit: Emit) {
  if (f.deletions) for (const d of f.deletions) commitDeletion(d, container, emit)
  if (f.subtreeFlags & MutationMask) for (let c = f.child; c; c = c.sibling) commitMutationEffects(c, container, emit)
  if (f.flags & Placement) {
    commitPlacement(f, container, emit)
    f.flags &= ~Placement
  }
  if (f.tag === 'component' && f.flags & LayoutEffect) runEffectCleanups(f, 'layout', 'mutation', emit)
  if (isHost(f) && f.flags & Update) commitUpdate(f, emit)
}

/** Layout phase: layout effects run, children first, before the browser paints. */
export function commitLayoutEffects(f: Fiber, emit: Emit) {
  const prev = rt.context
  rt.context = 'layout'
  try {
    layoutPass(f, emit)
  } finally {
    rt.context = prev
  }
}

function layoutPass(f: Fiber, emit: Emit) {
  if (f.subtreeFlags & LayoutMask) for (let c = f.child; c; c = c.sibling) layoutPass(c, emit)
  if (f.tag === 'component' && f.flags & LayoutEffect) runEffectBodies(f, 'layout', 'layout', emit)
}
