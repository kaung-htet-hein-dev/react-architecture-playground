import type { HookSlot, NodeState, TreeNode, Update } from '../types'
import { eventsOf, type ModelEvent } from './events'
import { hookTypes } from './hooks'
import type { Effect, Fiber, Hook } from './fiber'
import { laneName } from './lanes'
import type { Root } from './root'

export interface TreeSnapshotOptions {
  /** Which tree to draw (default current; `wip` falls back to current when no render is open). */
  tree?: 'current' | 'wip'
  /** Include host elements (div, p…). Default true. */
  hosts?: boolean
  /** Include text nodes. Default false. */
  text?: boolean
  /** Include the HostRoot node. Default false. */
  hostRoot?: boolean
  /** Node ids whose children are hidden. */
  collapse?: readonly string[]
  /** Per-node overrides merged into the result (state, tag, trigger, order…). */
  nodes?: Record<string, Partial<TreeNode>>
  /** Labels; default fiber name. */
  label?: (f: Fiber) => string
}

/** The fiber tree as TreeNode[] for ComponentTree. Ids are fiber node ids. */
export function toTreeNodes(root: Root, o: TreeSnapshotOptions = {}): TreeNode[] {
  const top = o.tree === 'wip' ? (root.wip ?? root.current) : root.current
  return fiberTreeNodes(top, o)
}

export function fiberTreeNodes(top: Fiber, o: TreeSnapshotOptions = {}): TreeNode[] {
  const out: TreeNode[] = []
  const include = (f: Fiber) =>
    f.tag === 'component' ||
    (f.tag === 'host' && o.hosts !== false) ||
    (f.tag === 'text' && o.text === true) ||
    (f.tag === 'root' && o.hostRoot === true)
  const visit = (f: Fiber, parent: string | undefined) => {
    let p = parent
    if (include(f)) {
      const node: TreeNode = { id: f.id, label: o.label ? o.label(f) : f.name, ...(parent ? { parent } : {}), ...(f.key != null ? { key: f.key } : {}) }
      out.push({ ...node, ...(o.nodes?.[f.id] ?? {}) })
      p = f.id
    }
    if (o.collapse?.includes(f.id)) return
    for (let c = f.child; c; c = c.sibling) visit(c, p)
  }
  visit(top, undefined)
  return out
}

export interface PassSummary {
  /** Node state per fiber id for this pass: render, skip, dom, removed, error. */
  states: Record<string, NodeState>
  /** Render order (1-based) of the components that were called. */
  order: Record<string, number>
  rendered: string[]
  /** Fibers a memo() bailout skipped. */
  skipped: string[]
  /** Fibers with at least one DOM write. */
  touched: string[]
  removed: string[]
}

/**
 * Summarize one pass (the events of a render + commit) into node states: components that
 * were called → render, memo bailouts → skip, hosts written to → dom, deletions → removed,
 * the component that threw → error.
 */
export function summarizePass(events: readonly ModelEvent[]): PassSummary {
  const states: Record<string, NodeState> = {}
  const order: Record<string, number> = {}
  const rendered: string[] = []
  const skipped: string[] = []
  const touched: string[] = []
  const removed: string[] = []
  for (const e of events) {
    if (e.type === 'render' && !rendered.includes(e.fiberId)) {
      rendered.push(e.fiberId)
      order[e.fiberId] = rendered.length
      states[e.fiberId] = 'render'
    } else if (e.type === 'bailout' && e.reason === 'memo') {
      skipped.push(e.fiberId)
      states[e.fiberId] = 'skip'
    } else if (e.type === 'dom' && e.op.nodeId) {
      if (!touched.includes(e.op.nodeId)) touched.push(e.op.nodeId)
      if (e.op.kind === 'remove') {
        removed.push(e.op.nodeId)
        states[e.op.nodeId] = 'removed'
      } else states[e.op.nodeId] = 'dom'
    } else if (e.type === 'reconcile' && e.action === 'delete') {
      if (!removed.includes(e.fiberId)) removed.push(e.fiberId)
      states[e.fiberId] = 'removed'
    } else if (e.type === 'error') {
      states[e.fiberId] = 'error'
    }
  }
  return { states, order, rendered, skipped, touched, removed }
}

const show = (v: unknown): string => {
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'function') return 'ƒ'
  if (Array.isArray(v)) return `[${v.map(show).join(', ')}]`
  if (v !== null && typeof v === 'object') return '{…}'
  return String(v)
}

/** `[0]` → `'[0]'`, null → `'none'` (React's "no array"). */
export const formatDeps = (deps: readonly unknown[] | null | undefined): string => (deps == null ? 'none' : show([...deps]))

/** One display value for a hook slot, e.g. `0`, `deps [1]`, `{ current: 0 }`. */
export function hookValue(h: Hook): string {
  switch (h.kind) {
    case 'useEffect':
    case 'useLayoutEffect':
    case 'useInsertionEffect': {
      const e = h.memoizedState as Effect
      return `deps ${formatDeps(e.deps)}`
    }
    case 'useRef':
      return `{ current: ${show((h.memoizedState as { current: unknown }).current)} }`
    case 'useMemo':
    case 'useCallback':
      return show((h.memoizedState as [unknown])[0])
    default:
      return show(h.memoizedState)
  }
}

/** The hook linked list of a component fiber as HookSlot[] (status left for the scenario). */
export function hookSlots(f: Fiber | null): HookSlot[] {
  const out: HookSlot[] = []
  if (!f) return out
  let i = 0
  for (let h = f.memoizedState; h; h = h.next) out.push({ index: i++, type: h.kind, component: f.name, value: hookValue(h), status: 'idle' })
  return out
}

/** Hook types called in the last render, including useContext (React's dev list). */
export const hookTypeList = hookTypes

/** Every queued update as the UI's Update shape. Filter by component name if given. */
export function queueSnapshot(root: Root, component?: string): Update[] {
  return root.updates
    .filter((u) => !component || u.component === component)
    .map((u) => ({
      id: u.id,
      component: u.component,
      text: u.text,
      lane: laneName(u.lane),
      status: u.status,
      kind: typeof u.action === 'function' ? 'updater' : 'value',
      ...(u.result !== undefined && u.status !== 'waiting' ? { result: `→ ${show(u.result)}` } : {}),
    }))
}

/** Effect events of one tag/timing, in order — handy for effect timelines. */
export const effectRuns = (events: readonly ModelEvent[]) => eventsOf(events, 'effect').filter((e) => e.action !== 'skip')
