import type { Fiber, Hook, HookQueue, ModelUpdate } from './fiber'
import {
  DefaultLane,
  getHighestPriorityLane,
  includesSomeLane,
  isSubsetOfLanes,
  laneName,
  NoLane,
  NoLanes,
  SyncLane,
  TransitionLane,
  type Lanes,
} from './lanes'
import { rt, type RootInternals } from './runtime'

/** useState's reducer: a function is an updater of the previous state, anything else replaces it. */
export const basicStateReducer = (state: unknown, action: unknown): unknown =>
  typeof action === 'function' ? (action as (s: unknown) => unknown)(state) : action

/**
 * The lane for a new update (React's requestUpdateLane): a forced lane (event, transition,
 * act) wins; inside a render it is the render's lane; layout effects are sync; everything else
 * (timers, passive effects, promises) is DefaultLane.
 */
export function requestUpdateLane(): Lanes {
  if (rt.laneOverride !== NoLane) return rt.laneOverride
  if (rt.context === 'render') return getHighestPriorityLane(rt.renderLanes)
  if (rt.context === 'layout' || rt.context === 'commit') return SyncLane
  return DefaultLane
}

const fmt = (v: unknown): string => {
  if (typeof v === 'function') return 'updater'
  if (typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.length} items]`
  if (v !== null && typeof v === 'object') return '{…}'
  return String(v)
}

const isRenderingFiber = (fiber: Fiber) =>
  rt.renderingFiber !== null && (fiber === rt.renderingFiber || fiber.alternate === rt.renderingFiber)

export interface DispatchOptions {
  /** Setter name for display, e.g. `setCount`. */
  setter: string
  /** useOptimistic: updates revert when this lane renders. */
  optimistic?: boolean
}

/**
 * React's dispatchSetState, bound to the fiber that mounted the hook. Returns the setter the
 * component gets. It takes an optional display text: `setCount(count + 1, 'setCount(0 + 1)')`.
 */
export function createDispatch(root: RootInternals, fiber: Fiber, queue: HookQueue, component: string, opts: DispatchOptions) {
  return (action: unknown, text?: string) => {
    const during = isRenderingFiber(fiber)
    const transitionLane = includesSomeLane(rt.laneOverride, TransitionLane) ? rt.laneOverride : TransitionLane
    const lane = opts.optimistic ? SyncLane : during ? getHighestPriorityLane(rt.renderLanes) : requestUpdateLane()
    const update: ModelUpdate = {
      id: root.nextUpdateId(),
      fiberId: fiber.id,
      component,
      action,
      lane,
      revertLane: opts.optimistic ? transitionLane : NoLane,
      text: text ?? `${opts.setter}(${fmt(action)})`,
      status: 'waiting',
    }
    root.updates.push(update)

    if (during) {
      // Render-phase update: re-run this component right away (renderWithHooks loops).
      rt.didScheduleRenderPhaseUpdate = true
      queue.pending.push(update)
      root.emit({ type: 'update-queued', fiberId: fiber.id, component, updateId: update.id, text: update.text, lane: laneName(lane), duringRender: true })
      return
    }

    // Eager bailout: nothing is queued on this fiber and the new state is the same value.
    const idle = fiber.lanes === NoLanes && (fiber.alternate === null || fiber.alternate.lanes === NoLanes)
    if (idle && !opts.optimistic) {
      const eager = queue.reducer(queue.lastRenderedState, action)
      if (Object.is(eager, queue.lastRenderedState)) {
        update.status = 'applied'
        update.result = eager
        queue.pending.push(update)
        root.emit({ type: 'update-bailout', fiberId: fiber.id, component, updateId: update.id, text: update.text })
        return
      }
    }

    queue.pending.push(update)
    root.emit({ type: 'update-queued', fiberId: fiber.id, component, updateId: update.id, text: update.text, lane: laneName(lane), duringRender: false })
    root.scheduleUpdate(fiber, lane)
  }
}

/**
 * React's updateReducer for one hook: move pending updates into the base queue, then apply
 * every update whose lane is being rendered. A skipped update stays in the base queue together
 * with every update after it, and the base state stops before it (rebasing), so updates are
 * always applied in order. Returns the new state.
 *
 * `current` is the hook from the committed render; `hook` is the new work-in-progress copy.
 */
export function processUpdateQueue(fiber: Fiber, hook: Hook, current: Hook, baseStateOverride?: { value: unknown }): unknown {
  const root = rt.root!
  const queue = hook.queue!
  const renderLanes = rt.renderLanes

  // Pending updates join the base queue on the current hook too, so a thrown-away render can't lose them.
  if (queue.pending.length) {
    current.baseQueue = [...current.baseQueue, ...queue.pending]
    queue.pending = []
  }
  const baseQueue = current.baseQueue
  let newState = baseStateOverride ? baseStateOverride.value : current.baseState
  let newBaseState: unknown = undefined
  let rebasing = false
  const newBaseQueue: ModelUpdate[] = []

  for (const u of baseQueue) {
    if (u.revertLane !== NoLane) {
      // useOptimistic: shown until the transition that owns it renders, then dropped.
      if (includesSomeLane(renderLanes, u.revertLane)) {
        u.status = 'cleared'
        continue
      }
      if (!rebasing) {
        rebasing = true
        newBaseState = newState
      }
      newBaseQueue.push(u)
    } else if (!isSubsetOfLanes(renderLanes, u.lane)) {
      if (!rebasing) {
        rebasing = true
        newBaseState = newState
      }
      newBaseQueue.push(u)
      fiber.lanes |= u.lane
      u.status = 'skipped'
      root.emit({ type: 'update-processed', fiberId: fiber.id, updateId: u.id, text: u.text, lane: laneName(u.lane), skipped: true })
      continue
    } else if (rebasing) {
      // Already applied once, but must re-apply after the skipped one: keep it, lane-free.
      newBaseQueue.push({ ...u, lane: NoLane })
    }
    newState = queue.reducer(newState, u.action)
    if (u.revertLane === NoLane) {
      u.status = 'applied'
      u.result = newState
    }
    root.emit({ type: 'update-processed', fiberId: fiber.id, updateId: u.id, text: u.text, lane: laneName(u.lane), skipped: false, result: newState })
  }

  if (!Object.is(newState, current.memoizedState)) rt.didReceiveUpdate = true
  hook.memoizedState = newState
  hook.baseState = rebasing ? newBaseState : newState
  hook.baseQueue = newBaseQueue
  queue.lastRenderedState = newState
  return newState
}

/** React's rerenderReducer: apply render-phase updates on top of the previous attempt. */
export function processRenderPhaseUpdates(fiber: Fiber, hook: Hook): unknown {
  const root = rt.root!
  const queue = hook.queue!
  let state = hook.memoizedState
  const updates = queue.pending
  queue.pending = []
  for (const u of updates) {
    state = queue.reducer(state, u.action)
    u.status = 'applied'
    u.result = state
    root.emit({ type: 'update-processed', fiberId: fiber.id, updateId: u.id, text: u.text, lane: laneName(u.lane), skipped: false, result: state })
  }
  if (!Object.is(state, hook.memoizedState)) rt.didReceiveUpdate = true
  hook.memoizedState = state
  if (hook.baseQueue.length === 0) hook.baseState = state
  queue.lastRenderedState = state
  return state
}
