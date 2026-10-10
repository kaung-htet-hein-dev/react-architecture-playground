import { createDomNode, type DomNode } from './dom'
import { isComponentType, type Child, type ComponentType, type ContextType, type Props } from './element'
import type { RenderReason } from './events'
import {
  createWorkInProgress,
  LayoutEffect,
  NoFlags,
  Passive,
  Update,
  walkFibers,
  type Fiber,
  type PropChange,
} from './fiber'
import { renderWithHooks } from './hooks'
import { includesSomeLane, NoLanes, type Lanes } from './lanes'
import { reconcileChildren } from './reconcile'
import { rt } from './runtime'

/* ------------------------------------------------------------------ begin */

/**
 * React's beginWork for one fiber. Returns the next fiber to work on (its first child), or
 * null when the subtree is done or skipped.
 *
 * Bailouts, in React's order:
 * 1. Same props object and nothing scheduled here (no lanes, no context change): reuse the
 *    fiber. If nothing below is scheduled either, skip the whole subtree.
 * 2. memo(): props equal under the compare function and nothing scheduled here.
 * 3. After calling the component, if no state changed and the props object is the same, reuse
 *    the old children.
 */
export function beginWork(current: Fiber | null, wip: Fiber, renderLanes: Lanes): Fiber | null {
  const emit = rt.root!.emit
  rt.didReceiveUpdate = false
  if (current !== null) {
    const propsChanged = current.memoizedProps !== wip.pendingProps
    if (propsChanged) {
      rt.didReceiveUpdate = true
    } else if (!hasScheduledWork(current, renderLanes)) {
      emit({ type: 'bailout', fiberId: wip.id, name: wip.name, reason: 'no-work', subtree: !includesSomeLane(renderLanes, wip.childLanes) })
      return bailoutOnAlreadyFinishedWork(current, wip, renderLanes)
    }
  }
  wip.lanes = NoLanes

  switch (wip.tag) {
    case 'root':
    case 'fragment':
    case 'host': {
      const props = wip.pendingProps
      const children = wip.tag === 'host' && shouldSetTextContent(props.children) ? null : props.children
      reconcileChildren(current, wip, children ?? null, renderLanes)
      return wip.child
    }
    case 'text':
      return null
    case 'provider':
      return updateProvider(current, wip, renderLanes)
    case 'component':
      return updateComponent(current, wip, renderLanes)
  }
}

function hasScheduledWork(current: Fiber, renderLanes: Lanes): boolean {
  if (includesSomeLane(current.lanes, renderLanes)) return true
  return contextChanged(current.dependencies)
}

function contextChanged(deps: Fiber['dependencies']): boolean {
  if (!deps) return false
  return deps.some((d) => !Object.is(d.memoizedValue, providerValue(d.context)))
}

/** Value a context has right now during this render (read via the provider's latest props). */
function providerValue(ctx: ContextType): unknown {
  return currentProviderValues.get(ctx) ?? ctx.defaultValue
}

/** Provider values on the current render path. Pushed in beginWork, popped in completeWork. */
const currentProviderValues = new Map<ContextType, unknown>()
const providerStack: { ctx: ContextType; prev: unknown; had: boolean }[] = []

export function resetProviderStack() {
  currentProviderValues.clear()
  providerStack.length = 0
}

function pushProvider(ctx: ContextType, value: unknown) {
  providerStack.push({ ctx, prev: currentProviderValues.get(ctx), had: currentProviderValues.has(ctx) })
  currentProviderValues.set(ctx, value)
}

export function popProvider(f: Fiber) {
  if (f.tag !== 'provider') return
  const top = providerStack.pop()
  if (!top) return
  if (top.had) currentProviderValues.set(top.ctx, top.prev)
  else currentProviderValues.delete(top.ctx)
}

/** When the walk resumes inside a tree (concurrent render), rebuild the provider stack. */
export function restoreProviderStack(f: Fiber | null) {
  resetProviderStack()
  const path: Fiber[] = []
  for (let p = f?.return ?? null; p; p = p.return) if (p.tag === 'provider') path.unshift(p)
  for (const p of path) pushProvider((p.type as { context: ContextType }).context, (p.memoizedProps ?? p.pendingProps).value)
}

function bailoutOnAlreadyFinishedWork(current: Fiber, wip: Fiber, renderLanes: Lanes): Fiber | null {
  if (wip.tag === 'provider') {
    // Children still read this provider; keep the stack balanced for completeWork.
    pushProvider((wip.type as { context: ContextType }).context, wip.pendingProps.value)
  }
  if (!includesSomeLane(renderLanes, wip.childLanes)) return null
  cloneChildFibers(current, wip)
  return wip.child
}

function cloneChildFibers(current: Fiber, wip: Fiber) {
  if (wip.child === null || wip.child !== current.child) return
  let cur: Fiber | null = wip.child
  let prevNew: Fiber | null = null
  while (cur) {
    const next = createWorkInProgress(cur, cur.pendingProps)
    next.return = wip
    if (prevNew === null) wip.child = next
    else prevNew.sibling = next
    prevNew = next
    cur = cur.sibling
  }
  if (prevNew) prevNew.sibling = null
}

function updateProvider(current: Fiber | null, wip: Fiber, renderLanes: Lanes): Fiber | null {
  const ctx = (wip.type as { context: ContextType }).context
  const value = wip.pendingProps.value
  pushProvider(ctx, value)
  if (current !== null && current.memoizedProps && !Object.is(current.memoizedProps.value, value)) {
    propagateContextChange(wip, ctx, renderLanes)
  }
  reconcileChildren(current, wip, wip.pendingProps.children ?? null, renderLanes)
  return wip.child
}

/**
 * The provider's value changed: find every fiber below that read this context and schedule
 * it, even inside subtrees a memo would otherwise skip. Stops at nested providers of the same
 * context.
 */
function propagateContextChange(provider: Fiber, ctx: ContextType, renderLanes: Lanes) {
  const emit = rt.root!.emit
  const visit = (f: Fiber | null) => {
    for (let c = f; c; c = c.sibling) {
      if (c.dependencies?.some((d) => d.context === ctx)) {
        c.lanes |= renderLanes
        if (c.alternate) c.alternate.lanes |= renderLanes
        for (let p = c.return; p && p !== provider; p = p.return) {
          p.childLanes |= renderLanes
          if (p.alternate) p.alternate.childLanes |= renderLanes
        }
        provider.childLanes |= renderLanes
        rt.contextMarked.add(c.id)
        emit({ type: 'context-propagate', providerId: provider.id, consumerId: c.id, context: ctx.name })
      }
      const nested = c.tag === 'provider' && (c.type as { context: ContextType }).context === ctx
      if (!nested) visit(c.child)
    }
  }
  visit(provider.child)
}

function updateComponent(current: Fiber | null, wip: Fiber, renderLanes: Lanes): Fiber | null {
  const emit = rt.root!.emit
  const type = wip.type as ComponentType<Props>
  if (!isComponentType(type)) throw new Error(`Unknown component type for ${wip.name}`)
  const props = wip.pendingProps

  const ownWork = current !== null && hasScheduledWork(current, renderLanes)
  if (current !== null && type.compare && !ownWork && current.memoizedProps && type.compare(current.memoizedProps, props)) {
    emit({ type: 'bailout', fiberId: wip.id, name: wip.name, reason: 'memo', subtree: !includesSomeLane(renderLanes, wip.childLanes) })
    return bailoutOnAlreadyFinishedWork(current, wip, renderLanes)
  }

  const reasons: RenderReason[] = []
  if (current === null) reasons.push('mount')
  else {
    if (includesSomeLane(current.lanes, renderLanes) && !rt.contextMarked.has(wip.id)) reasons.push('state')
    if (rt.contextMarked.has(wip.id) || contextChanged(current.dependencies)) reasons.push('context')
    if (current.memoizedProps !== props) reasons.push('parent')
  }
  const children: Child = renderWithHooks(current, wip, type, props, (attempt) =>
    emit({ type: 'render', fiberId: wip.id, component: wip.name, reasons, attempt }),
  )

  if (current !== null && !rt.didReceiveUpdate && !contextChangedSinceRender(current, wip)) {
    // Rendered, but nothing it depends on changed: keep the old children (bailoutHooks).
    wip.flags &= ~(Passive | LayoutEffect | Update)
    wip.effects = current.effects
    current.lanes &= ~renderLanes
    emit({ type: 'bailout', fiberId: wip.id, name: wip.name, reason: 'state-unchanged', subtree: !includesSomeLane(renderLanes, wip.childLanes) })
    return bailoutOnAlreadyFinishedWork(current, wip, renderLanes)
  }
  reconcileChildren(current, wip, children, renderLanes)
  return wip.child
}

function contextChangedSinceRender(current: Fiber, wip: Fiber): boolean {
  return rt.contextMarked.has(wip.id) || contextChanged(current.dependencies)
}

/* ------------------------------------------------------------------ complete */

/** React's shouldSetTextContent: a host whose only child is text sets textContent directly. */
export const shouldSetTextContent = (children: unknown) => typeof children === 'string' || typeof children === 'number'

const isEventProp = (k: string) => /^on[A-Z]/.test(k)

/** The attributes a host's props put on the DOM (no children, no event handlers). */
export function hostAttributes(props: Props): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children' || isEventProp(k) || v == null || v === false) continue
    if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) out[`style.${sk}`] = String(sv)
    } else out[k] = String(v)
  }
  if (shouldSetTextContent(props.children)) out.textContent = String(props.children)
  return out
}

function diffAttributes(prev: Props, next: Props): PropChange[] {
  const a = hostAttributes(prev)
  const b = hostAttributes(next)
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])]
  return keys.filter((k) => a[k] !== b[k]).map((k) => ({ name: k, prev: a[k], next: b[k] }))
}

function domLabel(f: Fiber): string {
  return f.key != null ? `${f.name}[key=${f.key}]` : f.name
}

function appendAllChildren(parent: DomNode, wip: Fiber) {
  let node = wip.child
  while (node) {
    if ((node.tag === 'host' || node.tag === 'text') && node.stateNode) {
      parent.children.push(node.stateNode)
      node.stateNode.parent = parent
    } else if (node.child) {
      node = node.child
      continue
    }
    if (node === wip) return
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) return
      node = node.return
    }
    node = node.sibling
  }
}

/**
 * React's completeWork: create DOM nodes for new hosts (detached, children appended), diff the
 * attributes of existing ones into `updatePayload`, and bubble lanes and flags up.
 */
export function completeWork(current: Fiber | null, wip: Fiber) {
  const emit = rt.root!.emit
  popProvider(wip)
  if (wip.tag === 'host') {
    const props = wip.memoizedProps ?? wip.pendingProps
    if (current !== null && wip.stateNode) {
      const changes = diffAttributes(current.memoizedProps ?? {}, props)
      if (changes.length) {
        wip.updatePayload = changes
        wip.flags |= Update
        emit({ type: 'complete', fiberId: wip.id, name: wip.name, created: false, changes })
      }
    } else {
      const node = createDomNode('element', wip.name, domLabel(wip))
      const attrs = hostAttributes(props)
      const { textContent, ...rest } = attrs
      node.attrs = rest
      if (textContent !== undefined) node.text = textContent
      appendAllChildren(node, wip)
      wip.stateNode = node
      emit({ type: 'complete', fiberId: wip.id, name: wip.name, created: true, changes: Object.entries(attrs).map(([name, next]) => ({ name, prev: undefined, next })) })
    }
  } else if (wip.tag === 'text') {
    const text = String((wip.memoizedProps ?? wip.pendingProps).nodeValue)
    if (current !== null && wip.stateNode) {
      const prev = String(current.memoizedProps?.nodeValue)
      if (prev !== text) {
        wip.updatePayload = [{ name: 'nodeValue', prev, next: text }]
        wip.flags |= Update
        emit({ type: 'complete', fiberId: wip.id, name: wip.name, created: false, changes: wip.updatePayload })
      }
    } else {
      const node = createDomNode('text', '#text', '#text')
      node.text = text
      wip.stateNode = node
    }
  }
  bubbleProperties(wip)
}

function bubbleProperties(wip: Fiber) {
  const didBailout = wip.alternate !== null && wip.alternate.child === wip.child
  let lanes = NoLanes
  let flags = NoFlags
  for (let c = wip.child; c; c = c.sibling) {
    lanes |= c.lanes | c.childLanes
    if (!didBailout) flags |= c.subtreeFlags | c.flags
  }
  wip.childLanes = lanes
  wip.subtreeFlags = flags
}

/* ------------------------------------------------------------------ work loop */

/** Begin `unit`, and complete it (and finished ancestors) when it has no child. */
export function performUnitOfWork(unit: Fiber, renderLanes: Lanes): Fiber | null {
  const current = unit.alternate
  const next = beginWork(current, unit, renderLanes)
  unit.memoizedProps = unit.pendingProps
  if (next !== null) return next
  return completeUnitOfWork(unit)
}

function completeUnitOfWork(unit: Fiber): Fiber | null {
  let completed: Fiber | null = unit
  while (completed) {
    completeWork(completed.alternate, completed)
    if (completed.sibling) return completed.sibling
    completed = completed.return
  }
  return null
}

/** Ids of every fiber in a work-in-progress tree that was begun (for "thrown away" displays). */
export function wipIds(root: Fiber): string[] {
  const out: string[] = []
  walkFibers(root, (f) => {
    out.push(f.id)
  })
  return out
}
