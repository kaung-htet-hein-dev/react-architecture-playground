import { Fragment, isElement, typeName, type Child, type Element, type Props } from './element'
import { ChildDeletion, childId, createFiber, createWorkInProgress, Placement, tagForType, type Fiber } from './fiber'
import type { Lanes } from './lanes'
import { rt } from './runtime'

/**
 * Child reconciliation (React's ChildReconciler): match the new children against the current
 * child fibers by key (or index when there is no key) and type. Matches reuse the fiber and its
 * DOM node; the rest are created (Placement) or deleted (ChildDeletion). In arrays a reused
 * fiber that now sits before one already placed is moved (Placement on an existing fiber).
 *
 * `track` is false inside a brand-new subtree: nothing to compare, and only the subtree's top
 * fiber gets a Placement.
 */
export function reconcileChildren(current: Fiber | null, wip: Fiber, next: Child, lanes: Lanes) {
  const track = current !== null
  wip.child = reconcileChildFibers(wip, current ? current.child : null, next, lanes, track)
}

const isText = (c: Child): c is string | number => (typeof c === 'string' && c !== '') || typeof c === 'number'

const textProps = (t: string | number): Props => ({ nodeValue: String(t) })

function emitReconcile(parent: Fiber, f: Fiber, action: 'update' | 'create' | 'delete' | 'move') {
  rt.root!.emit({ type: 'reconcile', parentId: parent.id, fiberId: f.id, name: f.name, key: f.key, action })
}

function reconcileChildFibers(parent: Fiber, first: Fiber | null, child: Child, lanes: Lanes, track: boolean): Fiber | null {
  // A top-level unkeyed <>…</> is treated like its children.
  if (isElement(child) && child.type === Fragment && child.key === null) child = child.props.children
  if (isElement(child)) return place(reconcileSingleElement(parent, first, child, track), track, true)
  if (isText(child)) return place(reconcileSingleText(parent, first, child, track), track, true)
  if (Array.isArray(child)) return reconcileArray(parent, first, child as readonly Child[], lanes, track)
  deleteRemaining(parent, first, track)
  return null
}

function place(f: Fiber, track: boolean, single: boolean): Fiber {
  if (single && track && f.alternate === null) {
    f.flags |= Placement
  }
  return f
}

function deleteChild(parent: Fiber, child: Fiber, track: boolean) {
  if (!track) return
  ;(parent.deletions ??= []).push(child)
  parent.flags |= ChildDeletion
  emitReconcile(parent, child, 'delete')
}

function deleteRemaining(parent: Fiber, first: Fiber | null, track: boolean) {
  for (let c = first; c; c = c.sibling) deleteChild(parent, c, track)
}

function reuseFiber(f: Fiber, props: Props): Fiber {
  const clone = createWorkInProgress(f, props)
  clone.index = 0
  clone.sibling = null
  return clone
}

function createFromElement(parent: Fiber, el: Element, index: number): Fiber {
  const name = typeName(el.type)
  const f = createFiber(tagForType(el.type), el.type, el.type === Fragment ? { children: el.props.children } : el.props, el.key, childId(parent, el, name, el.key, index))
  f.return = parent
  return f
}

function createText(parent: Fiber, t: string | number, index: number): Fiber {
  const f = createFiber('text', null, textProps(t), null, childId(parent, null, '#text', null, index))
  f.return = parent
  return f
}

function createFragment(parent: Fiber, children: readonly Child[], key: string | null, index: number): Fiber {
  const f = createFiber('fragment', Fragment, { children }, key, childId(parent, null, 'Fragment', key, index))
  f.return = parent
  return f
}

function reconcileSingleElement(parent: Fiber, first: Fiber | null, el: Element, track: boolean): Fiber {
  for (let c = first; c; c = c.sibling) {
    if (c.key === el.key) {
      if (c.type === el.type) {
        deleteRemaining(parent, c.sibling, track)
        const f = reuseFiber(c, el.type === Fragment ? { children: el.props.children } : el.props)
        f.return = parent
        if (track) emitReconcile(parent, f, 'update')
        return f
      }
      deleteRemaining(parent, c, track)
      break
    }
    deleteChild(parent, c, track)
  }
  const f = createFromElement(parent, el, 0)
  if (track) emitReconcile(parent, f, 'create')
  return f
}

function reconcileSingleText(parent: Fiber, first: Fiber | null, t: string | number, track: boolean): Fiber {
  if (first && first.tag === 'text') {
    deleteRemaining(parent, first.sibling, track)
    const f = reuseFiber(first, textProps(t))
    f.return = parent
    if (track) emitReconcile(parent, f, 'update')
    return f
  }
  deleteRemaining(parent, first, track)
  const f = createText(parent, t, 0)
  if (track) emitReconcile(parent, f, 'create')
  return f
}

/** Reuse `old` for `child` if key and type allow it; null means "no match in this slot". */
function updateSlot(parent: Fiber, old: Fiber | null, child: Child, index: number, track: boolean): Fiber | null {
  const key = old ? old.key : null
  if (isText(child)) {
    if (key !== null) return null
    return updateText(parent, old, child, index, track)
  }
  if (isElement(child)) {
    if (child.key !== key) return null
    return updateElement(parent, old, child, index, track)
  }
  if (Array.isArray(child)) {
    if (key !== null) return null
    return updateFragment(parent, old, child as readonly Child[], null, index, track)
  }
  return null
}

function updateText(parent: Fiber, old: Fiber | null, t: string | number, index: number, track: boolean): Fiber {
  if (old === null || old.tag !== 'text') {
    const f = createText(parent, t, index)
    if (track) emitReconcile(parent, f, 'create')
    return f
  }
  const f = reuseFiber(old, textProps(t))
  f.return = parent
  if (track) emitReconcile(parent, f, 'update')
  return f
}

function updateElement(parent: Fiber, old: Fiber | null, el: Element, index: number, track: boolean): Fiber {
  if (old !== null && old.type === el.type) {
    const f = reuseFiber(old, el.type === Fragment ? { children: el.props.children } : el.props)
    f.return = parent
    if (track) emitReconcile(parent, f, 'update')
    return f
  }
  const f = createFromElement(parent, el, index)
  if (track) emitReconcile(parent, f, 'create')
  return f
}

function updateFragment(parent: Fiber, old: Fiber | null, children: readonly Child[], key: string | null, index: number, track: boolean): Fiber {
  if (old === null || old.tag !== 'fragment') {
    const f = createFragment(parent, children, key, index)
    if (track) emitReconcile(parent, f, 'create')
    return f
  }
  const f = reuseFiber(old, { children })
  f.return = parent
  return f
}

function placeChild(f: Fiber, lastPlaced: number, newIndex: number, track: boolean, parent: Fiber): number {
  f.index = newIndex
  if (!track) return lastPlaced
  const current = f.alternate
  if (current !== null) {
    const oldIndex = current.index
    if (oldIndex < lastPlaced) {
      f.flags |= Placement
      emitReconcile(parent, f, 'move')
      return lastPlaced
    }
    return oldIndex
  }
  f.flags |= Placement
  return lastPlaced
}

function reconcileArray(parent: Fiber, first: Fiber | null, children: readonly Child[], _lanes: Lanes, track: boolean): Fiber | null {
  let resultFirst: Fiber | null = null
  let prevNew: Fiber | null = null
  let old = first
  let nextOld: Fiber | null
  let lastPlaced = 0
  let i = 0
  const link = (f: Fiber) => {
    if (prevNew === null) resultFirst = f
    else prevNew.sibling = f
    prevNew = f
  }

  for (; old !== null && i < children.length; i++) {
    if (old.index > i) {
      nextOld = old
      old = null
    } else {
      nextOld = old.sibling
    }
    const f = updateSlot(parent, old, children[i], i, track)
    if (f === null) {
      if (old === null) old = nextOld
      break
    }
    if (track && old && f.alternate === null) deleteChild(parent, old, track)
    lastPlaced = placeChild(f, lastPlaced, i, track, parent)
    link(f)
    old = nextOld
  }

  if (i === children.length) {
    deleteRemaining(parent, old, track)
    return resultFirst
  }

  if (old === null) {
    for (; i < children.length; i++) {
      const f = createChild(parent, children[i], i, track)
      if (f === null) continue
      lastPlaced = placeChild(f, lastPlaced, i, track, parent)
      link(f)
    }
    return resultFirst
  }

  const existing = new Map<string | number, Fiber>()
  for (let c: Fiber | null = old; c; c = c.sibling) existing.set(c.key ?? c.index, c)

  for (; i < children.length; i++) {
    const child = children[i]
    const mapKey = isElement(child) && child.key !== null ? child.key : i
    const match = existing.get(mapKey) ?? null
    let f: Fiber | null = null
    if (isText(child)) f = updateText(parent, match && match.tag === 'text' ? match : null, child, i, track)
    else if (isElement(child)) f = updateElement(parent, match, child, i, track)
    else if (Array.isArray(child)) f = updateFragment(parent, match, child as readonly Child[], null, i, track)
    if (f === null) continue
    if (track && f.alternate !== null) existing.delete(mapKey)
    lastPlaced = placeChild(f, lastPlaced, i, track, parent)
    link(f)
  }

  existing.forEach((c) => deleteChild(parent, c, track))
  return resultFirst
}

function createChild(parent: Fiber, child: Child, index: number, track: boolean): Fiber | null {
  let f: Fiber | null = null
  if (isText(child)) f = createText(parent, child, index)
  else if (isElement(child)) f = createFromElement(parent, child, index)
  else if (Array.isArray(child)) f = createFragment(parent, child as readonly Child[], null, index)
  if (f && track) emitReconcile(parent, f, 'create')
  return f
}
