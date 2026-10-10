import type { ModelEvent } from './events'
import type { Fiber, ModelUpdate } from './fiber'
import { NoLane, NoLanes, type Lanes } from './lanes'

/** What the hooks and the work loop need from the root they are working on. */
export interface RootInternals {
  emit(e: ModelEvent): void
  /** Mark `lane` on the fiber and its ancestors and add it to the root's pending lanes. */
  scheduleUpdate(fiber: Fiber, lane: Lanes): void
  nextUpdateId(): string
  updates: ModelUpdate[]
}

export type ExecutionContext = 'idle' | 'render' | 'commit' | 'layout' | 'passive'

/**
 * Module-level state of the model while it runs, like React's module globals
 * (currentlyRenderingFiber, renderLanes, executionContext…). The model is synchronous, so
 * one copy is enough; roots set `root` before doing any work.
 */
export const rt = {
  root: null as RootInternals | null,
  context: 'idle' as ExecutionContext,
  /** Lane forced by root.event / startTransition / root.act. */
  laneOverride: NoLane as Lanes,
  renderLanes: NoLanes as Lanes,
  renderingFiber: null as Fiber | null,
  didReceiveUpdate: false,
  didScheduleRenderPhaseUpdate: false,
  /** Fibers marked by context propagation during this render. */
  contextMarked: new Set<string>(),
}

/** Run `fn` with `rt.root` set, restoring the previous root afterwards. */
export function withRoot<T>(root: RootInternals, fn: () => T): T {
  const prev = rt.root
  rt.root = root
  try {
    return fn()
  } finally {
    rt.root = prev
  }
}

/** Run `fn` with every update it makes forced onto `lane`. */
export function withLane<T>(lane: Lanes, fn: () => T): T {
  const prev = rt.laneOverride
  rt.laneOverride = lane
  try {
    return fn()
  } finally {
    rt.laneOverride = prev
  }
}
