import type { HookType } from '../types'
import type { DomNode } from './dom'
import { typeName, type ContextType, type Element, type ElementType, type Props } from './element'
import { NoLanes, type Lanes } from './lanes'

/* ------------------------------------------------------------------ flags */

export const NoFlags = 0
export const Placement = 1 << 1
export const Update = 1 << 2
export const ChildDeletion = 1 << 4
/** Has a layout effect to run this commit (React folds this into Update). */
export const LayoutEffect = 1 << 6
export const Passive = 1 << 11
export const MutationMask = Placement | Update | ChildDeletion | LayoutEffect
export const LayoutMask = LayoutEffect
export const PassiveMask = Passive | ChildDeletion

/** Readable names of a fiber's flags, e.g. `['Update', 'Passive']`. */
export function flagNames(flags: number): string[] {
  const out: string[] = []
  if (flags & Placement) out.push('Placement')
  if (flags & Update) out.push('Update')
  if (flags & ChildDeletion) out.push('ChildDeletion')
  if (flags & LayoutEffect) out.push('Layout')
  if (flags & Passive) out.push('Passive')
  return out
}

/* ------------------------------------------------------------------ updates and hooks */

/** A queued state update. Shared by the current and work-in-progress hooks. */
export interface ModelUpdate {
  id: string
  /** Owning component's node id. */
  fiberId: string
  component: string
  action: unknown
  lane: Lanes
  /** useOptimistic: the transition lane whose render drops this update again. */
  revertLane: Lanes
  /** Source text for the UI, e.g. `setCount(0 + 1)`. */
  text: string
  /** Live status, updated by the model as the update moves through the queue. */
  status: 'waiting' | 'processing' | 'applied' | 'skipped' | 'cleared' | 'interrupted'
  /** Value after this update was applied in the last render that processed it. */
  result?: unknown
}

export interface HookQueue {
  pending: ModelUpdate[]
  /** Reducer used to apply actions (useState: value or updater function). */
  reducer: (state: unknown, action: unknown) => unknown
  lastRenderedState: unknown
  dispatch: (action: unknown, text?: string) => void
}

export type EffectTag = 'passive' | 'layout' | 'insertion'

/** Shared between renders so a cleanup survives until the next run or unmount. */
export interface EffectInstance {
  destroy: (() => void) | undefined
}

export interface Effect {
  id: string
  tag: EffectTag
  create: () => void | (() => void)
  deps: readonly unknown[] | null
  /** True when deps changed (or there are none) and the effect must run this commit. */
  hasEffect: boolean
  inst: EffectInstance
  /** Display label, e.g. `document.title`. */
  label: string
  /** Deps from the previous render, for display. */
  prevDeps: readonly unknown[] | null | undefined
}

/** One node of the hook linked list in `fiber.memoizedState`. */
export interface Hook {
  kind: HookType
  /** useState: the state. useEffect: the Effect. useMemo: [value, deps]. useRef: { current }. */
  memoizedState: unknown
  baseState: unknown
  /** Updates kept for the next render because their lane was skipped (rebasing). */
  baseQueue: ModelUpdate[]
  queue: HookQueue | null
  next: Hook | null
}

/* ------------------------------------------------------------------ fibers */

export type FiberTag = 'root' | 'component' | 'host' | 'text' | 'provider' | 'fragment'

export interface ContextDependency {
  context: ContextType
  memoizedValue: unknown
}

export interface PropChange {
  name: string
  prev: string | undefined
  next: string | undefined
}

export interface Fiber {
  /** Unique per fiber object (current and alternate differ). */
  uid: number
  /** Stable node identity shared with the alternate; used as TreeNode id. */
  id: string
  tag: FiberTag
  type: ElementType | null
  /** Display name: `Counter`, `div`, `#text`, `HostRoot`. */
  name: string
  key: string | null
  index: number

  pendingProps: Props
  memoizedProps: Props | null
  /** Function components: the first Hook. */
  memoizedState: Hook | null
  /** Function components: effects created by the last render, in hook order. */
  effects: Effect[]
  dependencies: ContextDependency[] | null

  stateNode: DomNode | null

  return: Fiber | null
  child: Fiber | null
  sibling: Fiber | null
  alternate: Fiber | null

  flags: number
  subtreeFlags: number
  deletions: Fiber[] | null
  /** Host fibers: attribute changes found by completeWork. Text fibers: [{ name: 'nodeValue' }]. */
  updatePayload: PropChange[] | null

  lanes: Lanes
  childLanes: Lanes
}

let nextUid = 1

export function createFiber(tag: FiberTag, type: ElementType | null, props: Props, key: string | null, id: string): Fiber {
  return {
    uid: nextUid++,
    id,
    tag,
    type,
    name: tag === 'text' ? '#text' : tag === 'root' ? 'HostRoot' : typeName(type),
    key,
    index: 0,
    pendingProps: props,
    memoizedProps: null,
    memoizedState: null,
    effects: [],
    dependencies: null,
    stateNode: null,
    return: null,
    child: null,
    sibling: null,
    alternate: null,
    flags: NoFlags,
    subtreeFlags: NoFlags,
    deletions: null,
    updatePayload: null,
    lanes: NoLanes,
    childLanes: NoLanes,
  }
}

/** React's createWorkInProgress: reuse (or create) the alternate and copy the current fields. */
export function createWorkInProgress(current: Fiber, pendingProps: Props): Fiber {
  let wip = current.alternate
  if (wip === null) {
    wip = createFiber(current.tag, current.type, pendingProps, current.key, current.id)
    wip.stateNode = current.stateNode
    wip.alternate = current
    current.alternate = wip
  } else {
    wip.pendingProps = pendingProps
    wip.type = current.type
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }
  wip.lanes = current.lanes
  wip.childLanes = current.childLanes
  wip.child = current.child
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState
  wip.effects = current.effects
  wip.dependencies = current.dependencies
  wip.updatePayload = null
  wip.sibling = current.sibling
  wip.index = current.index
  wip.stateNode = current.stateNode
  return wip
}

/** Pick the fiber tag for an element type. */
export function tagForType(type: ElementType): FiberTag {
  if (typeof type === 'string') return 'host'
  if (typeof type === 'symbol') return 'fragment'
  return (type as { $$kind: string }).$$kind === 'provider' ? 'provider' : 'component'
}

/** Node id for a new fiber: explicit `$id`, else parent path + name + key or index. */
export function childId(parent: Fiber, el: Element | null, name: string, key: string | null, index: number): string {
  if (el?.nodeId) return el.nodeId
  const base = parent.tag === 'root' ? '' : `${parent.id}/`
  return `${base}${name}${key != null ? `[${key}]` : index > 0 ? `#${index}` : ''}`
}

/** Walk every fiber under (and including) `f`, depth first, children in order. */
export function walkFibers(f: Fiber | null, visit: (f: Fiber, depth: number) => void | 'skip', depth = 0) {
  if (!f || visit(f, depth) === 'skip') return
  for (let ch = f.child; ch; ch = ch.sibling) walkFibers(ch, visit, depth + 1)
}

/** Nearest ancestor that is a component (for host nodes: the component that returned them). */
export function ownerComponent(f: Fiber): Fiber | null {
  for (let p = f.return; p; p = p.return) if (p.tag === 'component') return p
  return null
}
