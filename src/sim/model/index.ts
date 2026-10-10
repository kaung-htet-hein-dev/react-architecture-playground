/**
 * Tiny fiber model (REQUIREMENTS R-S2). Scenarios build their traces on it instead of
 * hand-writing frames. It is not React, but each mechanism follows React 19's semantics.
 *
 * WRITING COMPONENTS (element.ts, hooks.ts)
 *   const Counter = component('Counter', () => {
 *     const [count, setCount] = useState(0, 'count')          // label → "setCount(1)" in the queue
 *     useEffect(() => { … }, [count], 'document.title')        // label shown in effect UIs
 *     return h('div', null,
 *       h('button', { $id: 'button', onClick: () => setCount(count + 1) }, '+1'),
 *       h('p', { $id: 'p' }, 'Count: ', count))
 *   })
 *   h(type, props, ...children)  jsx(); `key` and `$id` (stable TreeNode id) are stripped from props
 *   component(name, render) · memo(C, compare?) · createContext(default, name) · Fragment
 *   Hooks: useState(init, label?) · useReducer · useEffect/useLayoutEffect(create, deps?, label?)
 *          useMemo · useCallback · useRef · useContext · useTransition · useDeferredValue
 *          useOptimistic · startTransition(fn). Setters take an optional display text:
 *          setCount(count + 1, 'setCount(0 + 1)').
 *
 * DRIVING A ROOT (root.ts) — every call is synchronous and returns the ModelEvent[] it caused
 *   const root = createRoot(h(App), { syncPassiveForDiscrete? })
 *   root.mount()                          initial render → commit → paint → passive (DefaultLane)
 *   root.click('button')                  run a host node's onClick as a discrete event (SyncLane)
 *   root.event(label, fn, lane?)          run any handler; its updates batch on `lane`
 *   root.act(fn, lane = DefaultLane)      updates from outside an event (timer, fetch)
 *   root.render({ lanes?, budget? })      render phase only → { status: complete|yielded|error|idle }
 *                                         transition renders yield after `budget` fibers; a
 *                                         higher-priority update restarts them ('interrupt')
 *   root.commit()                         mutation (DOM ops, layout cleanups) → root.current swap
 *                                         → layout effects
 *   root.paint() · root.flushPassiveEffects()   (cleanups first, then bodies)
 *   root.flush()                          all of the above in React's order until idle
 *   root.find(id | pred, 'current' | 'wip') · root.dom(id) · root.text(id?) · root.updates
 *   root.current / root.wip (HostRoot fibers) · root.pendingLanes · root.error · root.events
 *
 * READING RESULTS (events.ts, snapshot.ts)
 *   ModelEvent: event, update-queued, update-bailout, render-start, render (reasons: mount|state|
 *     context|parent, attempt), update-processed, context-propagate, bailout (no-work|memo|
 *     state-unchanged), reconcile (update|create|delete|move), complete (host diff), hook-order-
 *     warning, error, yield, interrupt, render-complete, commit-start, dom (DomOp), effect
 *     (cleanup|run|skip × render|mutation|layout|passive), root-swap, paint, passive-start
 *   eventsOf(events, type) · domOpsOf(events) · renderOrder(events)
 *   summarizePass(events) → { states, order, rendered, skipped, touched, removed }
 *   toTreeNodes(root, { tree, hosts, text, hostRoot, collapse, nodes, label }) → TreeNode[]
 *   hookSlots(fiber) → HookSlot[] · queueSnapshot(root, component?) → Update[] · formatDeps
 *
 * BUILDING STEPS (steps.ts)
 *   const b = stepBuilder<D>({ phase, caption, tree, preview, … })   index 0 = idle frame
 *   b.step({ phase, activeLine, caption, log?, domOps?, tree?, preview?, … })
 *   b.build() → Step<D>[]   (log/domOps accumulate; tree, preview, code… carry over)
 *
 * SEMANTICS COVERED
 *   Fibers: type, props, memoizedState (hook linked list), alternate (double buffering),
 *   child/sibling/return, lanes/childLanes, flags. Update queues with lanes and rebasing,
 *   eager same-state bailout, render-phase updates (25-render limit). Bailouts: same props +
 *   no work, memo (shallow Object.is), unchanged state after render; eager context
 *   propagation through memo-skipped subtrees. Keyed child reconciliation with moves
 *   (lastPlacedIndex). Commit: deletions, placements (insertBefore via host sibling), attribute
 *   and text writes; text-only children use textContent; event handlers cause no DOM writes.
 *   Layout effects before paint (cleanup in mutation, body in layout), passive after paint
 *   (all cleanups, then all bodies). Hook-order warnings and React's hook errors.
 *
 * NOT MODELED: Suspense/use(), error boundaries, refs on hosts, StrictMode double-invoke,
 *   React's one synchronous retry after a render error, server components.
 */

export * from './lanes'
export * from './element'
export * from './dom'
export * from './fiber'
export * from './events'
export {
  useState,
  useReducer,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
  useContext,
  useTransition,
  useDeferredValue,
  useOptimistic,
  startTransition,
  hookTypes,
  RE_RENDER_LIMIT,
  type Dispatch,
  type SetState,
} from './hooks'
export { basicStateReducer, requestUpdateLane } from './queue'
export { areHookInputsEqual } from './effects'
export { shouldSetTextContent, hostAttributes } from './render'
export { reconcileChildren } from './reconcile'
export { createRoot, type Root, type RootOptions, type RenderOptions, type RenderResult } from './root'
export * from './snapshot'
export * from './steps'
