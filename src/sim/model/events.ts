import type { DomOp, HookType, Lane } from '../types'
import type { EffectTag, PropChange } from './fiber'

/** Why a component was called this render. */
export type RenderReason = 'mount' | 'state' | 'context' | 'parent'

/**
 * Why work was skipped:
 * - `no-work`: props are the same object and nothing is scheduled here (React's early bailout).
 *   A parent render can't cause this; it happens to siblings and ancestors of an update.
 * - `memo`: memo() compared the props and found them equal.
 * - `state-unchanged`: the component rendered but every state value passed Object.is, so its
 *   children were reused.
 */
export type BailoutReason = 'no-work' | 'memo' | 'state-unchanged'

/**
 * Everything the model does, in order. A scenario turns these into Steps. Fiber ids are the
 * stable node ids used by TreeNode (`$id` or the parent path).
 */
export type ModelEvent =
  /** A user event handler started (root.event / root.click). */
  | { type: 'event'; label: string; lane: Lane }
  /** setState queued an update. `duringRender` when called while the component renders. */
  | { type: 'update-queued'; fiberId: string; component: string; updateId: string; text: string; lane: Lane; duringRender: boolean }
  /** setState computed the same state eagerly and scheduled nothing. */
  | { type: 'update-bailout'; fiberId: string; component: string; updateId: string; text: string }
  | { type: 'render-start'; lanes: Lane[]; resumed: boolean }
  /** A component function was called. `attempt` > 0 for re-renders caused by render-phase updates. */
  | { type: 'render'; fiberId: string; component: string; reasons: RenderReason[]; attempt: number }
  /** An update was applied (or skipped because its lane is not being rendered). */
  | { type: 'update-processed'; fiberId: string; updateId: string; text: string; lane: Lane; skipped: boolean; result?: unknown }
  /** A provider's value changed; this consumer was marked to render. */
  | { type: 'context-propagate'; providerId: string; consumerId: string; context: string }
  | { type: 'bailout'; fiberId: string; name: string; reason: BailoutReason; subtree: boolean }
  /** Child reconciliation result for one child (only where the old tree is compared). */
  | { type: 'reconcile'; parentId: string; fiberId: string; name: string; key: string | null; action: 'update' | 'create' | 'delete' | 'move' }
  /** completeWork: a host node was created, or its attributes/text differ. */
  | { type: 'complete'; fiberId: string; name: string; created: boolean; changes: PropChange[] }
  | { type: 'hook-order-warning'; fiberId: string; component: string; previous: HookType[]; next: HookType[] }
  | { type: 'error'; fiberId: string; component: string; message: string; renders: number }
  /** Concurrent render yielded to the browser after `units` fibers. */
  | { type: 'yield'; units: number }
  /** An unfinished render was thrown away for a higher-priority one. */
  | { type: 'interrupt'; lanes: Lane[]; by: Lane[]; discarded: string[] }
  | { type: 'render-complete'; lanes: Lane[] }
  | { type: 'commit-start'; lanes: Lane[] }
  | { type: 'dom'; fiberId: string; op: DomOp }
  /**
   * Effect activity. `timing`: render (deps compared), mutation (layout cleanup), layout,
   * passive. `action` skip = deps unchanged.
   */
  | {
      type: 'effect'
      fiberId: string
      component: string
      effectId: string
      tag: EffectTag
      label: string
      action: 'cleanup' | 'run' | 'skip'
      timing: 'render' | 'mutation' | 'layout' | 'passive'
      /** The component is being removed (cleanup on unmount). */
      unmount?: boolean
    }
  /** root.current now points at the finished tree. */
  | { type: 'root-swap'; domOps: number }
  | { type: 'paint' }
  | { type: 'passive-start' }

export type ModelEventType = ModelEvent['type']

/** Narrow a list of events to one type. */
export function eventsOf<T extends ModelEventType>(events: readonly ModelEvent[], type: T): Extract<ModelEvent, { type: T }>[] {
  return events.filter((e): e is Extract<ModelEvent, { type: T }> => e.type === type)
}

/** The DOM ops in a list of events, in commit order. */
export const domOpsOf = (events: readonly ModelEvent[]): DomOp[] => eventsOf(events, 'dom').map((e) => e.op)

/** Ids of components called, in render order (first call only). */
export function renderOrder(events: readonly ModelEvent[]): string[] {
  const out: string[] = []
  for (const e of eventsOf(events, 'render')) if (!out.includes(e.fiberId)) out.push(e.fiberId)
  return out
}

/** Error thrown inside the model, e.g. "Too many re-renders". */
export class ModelError extends Error {
  readonly fiberId: string
  constructor(message: string, fiberId: string) {
    super(message)
    this.name = 'Error'
    this.fiberId = fiberId
  }
}
