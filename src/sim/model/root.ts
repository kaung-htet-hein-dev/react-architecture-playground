import { commitLayoutEffects, commitMutationEffects } from './commit'
import { createDomNode, queryDom, textContent, type DomNode } from './dom'
import type { Element } from './element'
import { flushPassiveEffects } from './effects'
import { ModelError, type ModelEvent } from './events'
import { createFiber, createWorkInProgress, PassiveMask, walkFibers, type Fiber, type ModelUpdate } from './fiber'
import {
  DefaultLane,
  getHighestPriorityLane,
  includesBlockingLane,
  includesSomeLane,
  laneNames,
  NoLanes,
  SyncLane,
  type Lanes,
} from './lanes'
import { performUnitOfWork, resetProviderStack, restoreProviderStack, wipIds } from './render'
import { rt, withLane, withRoot, type RootInternals } from './runtime'

export interface RootOptions {
  /**
   * React 18+ flushes the passive effects of a render caused by a discrete event (a click, a
   * keypress: SyncLane) synchronously at the end of the commit, before the browser can paint.
   * Off by default, because the guide shows the general rule ("passive effects run after
   * paint"), which is what happens for updates from timers, fetches and transitions.
   */
  syncPassiveForDiscrete?: boolean
}

export interface RenderOptions {
  /** Lanes to render; default: the highest-priority pending lanes. */
  lanes?: Lanes
  /**
   * Fibers to process before yielding. Only non-blocking (transition) renders yield, as in
   * React; Sync and Default renders always finish.
   */
  budget?: number
}

export interface RenderResult {
  status: 'complete' | 'yielded' | 'error' | 'idle'
  events: ModelEvent[]
  lanes: Lanes
  error?: ModelError
}

export interface Root {
  /** The page: host nodes are attached here by the commit phase. */
  readonly container: DomNode
  /** HostRoot of the committed tree (`root.current`). */
  readonly current: Fiber
  /** HostRoot of the tree being rendered, while a render is open. */
  readonly wip: Fiber | null
  /** Lanes with work scheduled and not yet committed. */
  readonly pendingLanes: Lanes
  /** Every update ever queued, with live status (waiting → applied → cleared). */
  readonly updates: readonly ModelUpdate[]
  /** Every event since createRoot. */
  readonly events: readonly ModelEvent[]
  /** The error that stopped the last render, if any. */
  readonly error: ModelError | null

  /** Initial render of the element (DefaultLane): render, commit, paint, passive effects. */
  mount(): ModelEvent[]
  /** Run an event handler as a discrete event: its updates are batched on `lane` (SyncLane). */
  event(label: string, handler: () => void, lane?: Lanes): ModelEvent[]
  /** Call a host node's `on<Event>` prop as a discrete event, e.g. `click('counter/button')`. */
  click(target: string | ((f: Fiber) => boolean), handlerProp?: string): ModelEvent[]
  /** Run code outside any event (timer, fetch callback): updates go on `lane` (DefaultLane). */
  act(fn: () => void, lane?: Lanes): ModelEvent[]
  /** Render phase only. Resumes a yielded render, or restarts it if higher-priority work arrived. */
  render(opts?: RenderOptions): RenderResult
  /** Commit the finished render: mutations, root.current swap, layout effects. */
  commit(): ModelEvent[]
  /** The browser paints. */
  paint(): ModelEvent[]
  /** Run pending passive effects (cleanups first, then bodies). */
  flushPassiveEffects(): ModelEvent[]
  /**
   * Do all pending work in React's order: render → commit (sync work scheduled by layout
   * effects re-renders before paint) → paint → passive effects → repeat while work remains.
   */
  flush(): ModelEvent[]
  hasPendingWork(): boolean
  /** Find a fiber by node id or predicate, in the committed tree (or the wip tree). */
  find(target: string | ((f: Fiber) => boolean), tree?: 'current' | 'wip'): Fiber | null
  /** The DOM node a host fiber owns. */
  dom(target: string | ((f: Fiber) => boolean)): DomNode | null
  /** textContent of a host node (or the whole page). */
  text(target?: string): string
}

/**
 * Create a root for an element, like `createRoot(container).render(<App />)` (call `mount()` to
 * do the initial render). All work is synchronous; each method returns the events it caused.
 */
export function createRoot(element: Element, opts: RootOptions = {}): Root {
  const container = createDomNode('container', '#root', 'root')
  const hostRoot = createFiber('root', null, { children: element }, null, 'root')
  hostRoot.memoizedProps = null
  hostRoot.stateNode = container

  const events: ModelEvent[] = []
  const updates: ModelUpdate[] = []
  let current = hostRoot
  let wipRoot: Fiber | null = null
  let wipLanes: Lanes = NoLanes
  let next: Fiber | null = null
  let pendingLanes: Lanes = NoLanes
  let interleaved: Lanes = NoLanes
  let finished: Fiber | null = null
  let pendingPassive: Fiber | null = null
  let error: ModelError | null = null
  let updateSeq = 0

  const internals: RootInternals = {
    emit: (e) => {
      events.push(e)
    },
    scheduleUpdate: (fiber, lane) => {
      fiber.lanes |= lane
      if (fiber.alternate) fiber.alternate.lanes |= lane
      for (let p = fiber.return; p; p = p.return) {
        p.childLanes |= lane
        if (p.alternate) p.alternate.childLanes |= lane
      }
      pendingLanes |= lane
      if (wipRoot) interleaved |= lane
    },
    nextUpdateId: () => `u${++updateSeq}`,
    updates,
  }

  const since = (start: number) => events.slice(start)
  const run = <T,>(fn: () => T) => withRoot(internals, fn)

  function prepareFreshStack(lanes: Lanes) {
    // The HostRoot's props object only changes on mount, so later renders bail out at the root.
    wipRoot = createWorkInProgress(current, current.memoizedProps ?? { children: element })
    wipLanes = lanes
    next = wipRoot
    interleaved = NoLanes
    finished = null
    rt.contextMarked = new Set()
    resetProviderStack()
  }

  function discardWip(by: Lanes) {
    if (!wipRoot) return
    const discarded = wipIds(wipRoot)
    for (const u of updates) if (u.status === 'applied' && includesSomeLane(u.lane, wipLanes)) u.status = 'interrupted'
    internals.emit({ type: 'interrupt', lanes: laneNames(wipLanes), by: laneNames(by), discarded })
    wipRoot = null
    next = null
    wipLanes = NoLanes
  }

  function render(o: RenderOptions = {}): RenderResult {
    return run(() => {
      const start = events.length
      if (finished) return { status: 'complete', events: [], lanes: wipLanes }
      const lanes = o.lanes ?? getHighestPriorityLane(pendingLanes)
      if (lanes === NoLanes && !wipRoot) return { status: 'idle', events: [], lanes }
      let resumed = false
      if (wipRoot && lanes !== wipLanes) discardWip(lanes)
      if (!wipRoot) prepareFreshStack(lanes)
      else {
        resumed = true
        restoreProviderStack(next)
      }
      internals.emit({ type: 'render-start', lanes: laneNames(wipLanes), resumed })

      const canYield = !includesBlockingLane(wipLanes) && o.budget != null
      let units = 0
      const prevContext = rt.context
      rt.context = 'render'
      rt.renderLanes = wipLanes
      try {
        while (next) {
          if (canYield && units >= o.budget!) {
            internals.emit({ type: 'yield', units })
            return { status: 'yielded', events: since(start), lanes: wipLanes }
          }
          next = performUnitOfWork(next, wipLanes)
          units++
        }
      } catch (e) {
        const err = e instanceof ModelError ? e : new ModelError(String((e as Error)?.message ?? e), 'root')
        error = err
        const renders = events.filter((ev) => ev.type === 'render' && ev.fiberId === err.fiberId).length
        const fiber = wipRoot ? findIn(wipRoot, err.fiberId) : null
        internals.emit({ type: 'error', fiberId: err.fiberId, component: fiber?.name ?? err.fiberId, message: err.message, renders })
        pendingLanes &= ~wipLanes
        wipRoot = null
        next = null
        return { status: 'error', events: since(start), lanes, error: err }
      } finally {
        rt.context = prevContext
        rt.renderLanes = NoLanes
      }
      finished = wipRoot
      internals.emit({ type: 'render-complete', lanes: laneNames(wipLanes) })
      return { status: 'complete', events: since(start), lanes: wipLanes }
    })
  }

  function commit(): ModelEvent[] {
    return run(() => {
      const start = events.length
      const done = finished
      if (!done) return []
      const lanes = wipLanes
      internals.emit({ type: 'commit-start', lanes: laneNames(lanes) })
      const prevContext = rt.context
      rt.context = 'commit'
      try {
        commitMutationEffects(done, container, internals.emit)
        current = done
        const ops = events.slice(start).filter((e) => e.type === 'dom').length
        internals.emit({ type: 'root-swap', domOps: ops })
        finished = null
        wipRoot = null
        next = null
        pendingLanes = done.lanes | done.childLanes | interleaved
        interleaved = NoLanes
        for (const u of updates) if (u.status === 'applied' && !stillQueued(done, u)) u.status = 'cleared'
        if ((done.subtreeFlags | done.flags) & PassiveMask) pendingPassive = done
        commitLayoutEffects(done, internals.emit)
      } finally {
        rt.context = prevContext
      }
      if (opts.syncPassiveForDiscrete && includesSomeLane(lanes, SyncLane)) flushPassive()
      return since(start)
    })
  }

  function flushPassive(): ModelEvent[] {
    return run(() => {
      const start = events.length
      const tree = pendingPassive
      if (!tree) return []
      pendingPassive = null
      flushPassiveEffects(tree, internals.emit)
      return since(start)
    })
  }

  function paint(): ModelEvent[] {
    const start = events.length
    internals.emit({ type: 'paint' })
    return since(start)
  }

  function flush(): ModelEvent[] {
    const start = events.length
    let needsPaint = false
    for (let guard = 0; guard < 200; guard++) {
      if (pendingLanes !== NoLanes || wipRoot) {
        const r = render()
        if (r.status === 'error') break
        if (r.status !== 'complete') continue
        commit()
        needsPaint = true
        if (includesSomeLane(pendingLanes, SyncLane)) continue
      }
      if (needsPaint) {
        paint()
        needsPaint = false
      }
      if (pendingPassive) {
        flushPassive()
        continue
      }
      if (pendingLanes === NoLanes && !wipRoot) break
    }
    return since(start)
  }

  function findIn(tree: Fiber, target: string | ((f: Fiber) => boolean)): Fiber | null {
    const pred = typeof target === 'string' ? (f: Fiber) => f.id === target : target
    let hit: Fiber | null = null
    walkFibers(tree, (f) => {
      if (hit) return 'skip'
      if (pred(f)) hit = f
    })
    return hit
  }

  const root: Root = {
    container,
    get current() {
      return current
    },
    get wip() {
      return wipRoot
    },
    get pendingLanes() {
      return pendingLanes
    },
    updates,
    events,
    get error() {
      return error
    },
    mount() {
      const start = events.length
      pendingLanes |= DefaultLane
      hostRoot.lanes |= DefaultLane
      flush()
      return since(start)
    },
    event(label, handler, lane = SyncLane) {
      const start = events.length
      run(() => {
        internals.emit({ type: 'event', label, lane: laneNames(lane)[0] ?? 'SyncLane' })
        withLane(lane, handler)
      })
      return since(start)
    },
    click(target, handlerProp = 'onClick') {
      const f = findIn(current, target)
      const handler = f?.memoizedProps?.[handlerProp]
      if (typeof handler !== 'function') throw new Error(`No ${handlerProp} handler on ${String(target)}`)
      return root.event(`${handlerProp.slice(2).toLowerCase()} on <${f!.name}>`, () => (handler as () => void)())
    },
    act(fn, lane = DefaultLane) {
      const start = events.length
      run(() => withLane(lane, fn))
      return since(start)
    },
    render,
    commit,
    paint,
    flushPassiveEffects: flushPassive,
    flush,
    hasPendingWork: () => pendingLanes !== NoLanes || wipRoot !== null || pendingPassive !== null,
    find: (target, tree = 'current') => {
      const t = tree === 'wip' ? wipRoot : current
      return t ? findIn(t, target) : null
    },
    dom: (target) => {
      const f = findIn(current, target)
      return f && (f.tag === 'host' || f.tag === 'text') ? f.stateNode : null
    },
    text: (target) => {
      if (!target) return textContent(container)
      const n = root.dom(target) ?? queryDom(container, (d) => d.tag === target)
      return n ? textContent(n) : ''
    },
  }
  return root
}

/** True when an update is still in some hook's base queue of the committed tree (it was skipped). */
function stillQueued(tree: Fiber, u: ModelUpdate): boolean {
  let found = false
  walkFibers(tree, (f) => {
    if (found) return 'skip'
    for (let h = f.tag === 'component' ? f.memoizedState : null; h; h = h.next) {
      if (h.baseQueue.some((b) => b.id === u.id)) {
        found = true
        return 'skip'
      }
    }
  })
  return found
}
