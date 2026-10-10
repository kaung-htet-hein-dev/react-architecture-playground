import type { HookType } from '../types'
import type { Child, ComponentType, ContextType, Props } from './element'
import { ModelError } from './events'
import { areHookInputsEqual } from './effects'
import {
  LayoutEffect,
  Passive,
  Update as UpdateFlag,
  type Effect,
  type EffectTag,
  type Fiber,
  type Hook,
  type HookQueue,
} from './fiber'
import { includesBlockingLane, TransitionLane } from './lanes'
import { basicStateReducer, createDispatch, processRenderPhaseUpdates, processUpdateQueue } from './queue'
import { rt, withLane } from './runtime'

/** React's limit on render-phase updates before it gives up. */
export const RE_RENDER_LIMIT = 25

interface Cursor {
  fiber: Fiber
  /** Hook list being read (previous render or previous attempt). */
  prev: Hook | null
  /** First mount of this component: create hooks instead of reading them. */
  mount: boolean
  /** Re-render after a render-phase update: apply those updates. */
  rerender: boolean
  first: Hook | null
  last: Hook | null
  index: number
  types: HookType[]
  prevTypes: HookType[]
  warned: boolean
}

let cursor: Cursor | null = null

const hookTypesOf = new WeakMap<Fiber, HookType[]>()

/** Hook types called by a fiber's last render, in order (the dev-mode "hook types" list). */
export const hookTypes = (f: Fiber | null): HookType[] => (f ? (hookTypesOf.get(f) ?? []) : [])

function need(): Cursor {
  if (!cursor) throw new Error('Invalid hook call. Hooks can only be called inside of the body of a function component.')
  return cursor
}

function recordType(c: Cursor, kind: HookType) {
  const i = c.types.length
  c.types.push(kind)
  if (!c.mount && !c.warned && c.prevTypes[i] !== undefined && c.prevTypes[i] !== kind) {
    c.warned = true
    rt.root!.emit({ type: 'hook-order-warning', fiberId: c.fiber.id, component: c.fiber.name, previous: [...c.prevTypes], next: [...c.types] })
  }
}

/** Next hook in the list: a new one on mount, else a copy of the previous render's hook. */
function nextHook(kind: HookType): { hook: Hook; prev: Hook | null } {
  const c = need()
  recordType(c, kind)
  let hook: Hook
  let prev: Hook | null = null
  if (c.mount) {
    hook = { kind, memoizedState: undefined, baseState: undefined, baseQueue: [], queue: null, next: null }
  } else {
    prev = c.prev
    if (prev === null) throw new ModelError('Rendered more hooks than during the previous render.', c.fiber.id)
    c.prev = prev.next
    hook = { kind, memoizedState: prev.memoizedState, baseState: prev.baseState, baseQueue: prev.baseQueue, queue: prev.queue, next: null }
  }
  if (c.last) c.last.next = hook
  else c.first = hook
  c.last = hook
  c.index++
  return { hook, prev }
}

const setterName = (label?: string) => (label ? `set${label[0].toUpperCase()}${label.slice(1)}` : 'setState')

function stateHook<S>(kind: HookType, initial: S | (() => S), reducer: HookQueue['reducer'], setter: string, optimistic = false) {
  const c = need()
  const { hook, prev } = nextHook(kind)
  if (c.mount) {
    const value = typeof initial === 'function' ? (initial as () => S)() : initial
    hook.memoizedState = hook.baseState = value
    const queue: HookQueue = { pending: [], reducer, lastRenderedState: value, dispatch: () => {} }
    queue.dispatch = createDispatch(rt.root!, c.fiber, queue, c.fiber.name, { setter, optimistic })
    hook.queue = queue
  } else {
    if (!hook.queue) {
      throw new ModelError(
        'Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)',
        c.fiber.id,
      )
    }
    hook.queue.reducer = reducer
    if (c.rerender) processRenderPhaseUpdates(c.fiber, hook)
    else processUpdateQueue(c.fiber, hook, prev!, optimistic ? { value: initial } : undefined)
  }
  return [hook.memoizedState as S, hook.queue!.dispatch] as const
}

/** A state setter. The optional second argument is display text for the queue UI. */
export type Dispatch<A> = (action: A, text?: string) => void
export type SetState<S> = Dispatch<S | ((prev: S) => S)>

/** `useState(0, 'count')`: the label names the setter (`setCount`) in update text. */
export function useState<S>(initial: S | (() => S), label?: string): readonly [S, SetState<S>] {
  return stateHook('useState', initial, basicStateReducer, setterName(label)) as readonly [S, SetState<S>]
}

export function useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S, label = 'dispatch'): readonly [S, Dispatch<A>] {
  return stateHook('useReducer', initial, reducer as HookQueue['reducer'], label) as readonly [S, Dispatch<A>]
}

function effectHook(kind: HookType, tag: EffectTag, create: Effect['create'], deps: readonly unknown[] | null | undefined, label?: string) {
  const c = need()
  const id = `${c.fiber.id}:${c.index}`
  const { hook, prev } = nextHook(kind)
  const nextDeps = deps ?? null
  const flag = tag === 'passive' ? Passive : LayoutEffect | UpdateFlag
  const prevEffect = prev?.memoizedState as Effect | undefined
  const isEffect = prevEffect !== undefined && typeof prevEffect === 'object' && prevEffect !== null && 'inst' in prevEffect
  // A re-render attempt compares against the committed deps, which the previous attempt kept.
  const committedDeps = isEffect ? (c.rerender ? prevEffect.prevDeps : prevEffect.deps) : undefined
  const forced = c.rerender && isEffect && prevEffect.hasEffect
  let effect: Effect
  if (!c.mount && !forced && isEffect && nextDeps !== null && committedDeps != null && areHookInputsEqual(nextDeps, committedDeps)) {
    effect = { id, tag, create, deps: nextDeps, hasEffect: false, inst: prevEffect.inst, label: label ?? kind, prevDeps: committedDeps }
    if (!c.rerender) {
      rt.root!.emit({ type: 'effect', fiberId: c.fiber.id, component: c.fiber.name, effectId: id, tag, label: effect.label, action: 'skip', timing: 'render' })
    }
  } else {
    effect = {
      id,
      tag,
      create,
      deps: nextDeps,
      hasEffect: true,
      inst: isEffect ? prevEffect.inst : { destroy: undefined },
      label: label ?? kind,
      prevDeps: committedDeps,
    }
    c.fiber.flags |= flag
  }
  hook.memoizedState = effect
  c.fiber.effects.push(effect)
}

/** `useEffect(create, deps?, label?)`: runs after paint. `label` names it in the UI. */
export function useEffect(create: Effect['create'], deps?: readonly unknown[] | null, label?: string) {
  effectHook('useEffect', 'passive', create, deps, label)
}

/** Runs after the DOM writes, before paint. */
export function useLayoutEffect(create: Effect['create'], deps?: readonly unknown[] | null, label?: string) {
  effectHook('useLayoutEffect', 'layout', create, deps, label)
}

export function useMemo<T>(compute: () => T, deps: readonly unknown[]): T {
  const c = need()
  const { hook } = nextHook('useMemo')
  const prev = hook.memoizedState as [T, readonly unknown[]] | undefined
  if (!c.mount && Array.isArray(prev) && areHookInputsEqual(deps, prev[1])) return prev[0]
  const value = compute()
  hook.memoizedState = [value, deps]
  return value
}

export function useCallback<T>(fn: T, deps: readonly unknown[]): T {
  const c = need()
  const { hook } = nextHook('useCallback')
  const prev = hook.memoizedState as [T, readonly unknown[]] | undefined
  if (!c.mount && Array.isArray(prev) && areHookInputsEqual(deps, prev[1])) return prev[0]
  hook.memoizedState = [fn, deps]
  return fn
}

export function useRef<T>(initial: T): { current: T } {
  const c = need()
  const { hook } = nextHook('useRef')
  if (c.mount) hook.memoizedState = { current: initial }
  return hook.memoizedState as { current: T }
}

/**
 * Reads the nearest provider's value and subscribes this fiber to it. Like React, it is not a
 * slot in the hook list (only in the dev hook-types list).
 */
export function useContext<T>(ctx: ContextType<T>): T {
  const c = need()
  recordType(c, 'useContext')
  let value = ctx.defaultValue
  for (let p = c.fiber.return; p; p = p.return) {
    if (p.tag === 'provider' && (p.type as { context: unknown }).context === ctx) {
      value = (p.memoizedProps ?? p.pendingProps).value as T
      break
    }
  }
  const deps = (c.fiber.dependencies ??= [])
  deps.push({ context: ctx as ContextType, memoizedValue: value })
  return value
}

/** Run `fn` with every update it makes on TransitionLane. */
export function startTransition(fn: () => void) {
  withLane(TransitionLane, fn)
}

/**
 * React's useTransition: `isPending` flips to true at the event's priority, and the scope's
 * updates (plus `isPending = false`) go on TransitionLane.
 */
export function useTransition(): readonly [boolean, (fn: () => void) => void] {
  const [pending, setPending] = stateHook('useTransition', false, basicStateReducer, 'setPending')
  const start = (fn: () => void) => {
    setPending(true, 'isPending → true')
    startTransition(() => {
      setPending(false, 'isPending → false')
      fn()
    })
  }
  return [pending as boolean, start] as const
}

/**
 * React's useDeferredValue: during an urgent render it keeps the old value and schedules a
 * TransitionLane render of this component; during that render it returns the new value.
 */
export function useDeferredValue<T>(value: T): T {
  const c = need()
  const { hook } = nextHook('useDeferredValue')
  if (c.mount) {
    hook.memoizedState = value
    return value
  }
  const prev = hook.memoizedState as T
  if (Object.is(prev, value)) return value
  if (!includesBlockingLane(rt.renderLanes)) {
    hook.memoizedState = value
    rt.didReceiveUpdate = true
    return value
  }
  c.fiber.lanes |= TransitionLane
  return prev
}

/**
 * React's useOptimistic: `addOptimistic` applies on top of `passthrough` right away (SyncLane)
 * and is dropped when the surrounding transition renders. Call it inside startTransition.
 */
export function useOptimistic<S, A = S>(
  passthrough: S,
  reducer: (state: S, action: A) => S = (_s, a) => a as unknown as S,
): readonly [S, Dispatch<A>] {
  return stateHook('useOptimistic', passthrough, reducer as HookQueue['reducer'], 'addOptimistic', true) as readonly [S, Dispatch<A>]
}

/**
 * Call a component with hooks (React's renderWithHooks). Render-phase updates re-run it up to
 * RE_RENDER_LIMIT times; then it throws "Too many re-renders".
 */
export function renderWithHooks(current: Fiber | null, wip: Fiber, Component: ComponentType<Props>, props: Props, emitRender: (attempt: number) => void): Child {
  const prevTypes = hookTypes(current)
  let attempt = 0
  let children: Child
  const prevCursor = cursor
  rt.renderingFiber = wip
  try {
    for (;;) {
      rt.didScheduleRenderPhaseUpdate = false
      const prevList = attempt === 0 ? (current ? current.memoizedState : null) : wip.memoizedState
      cursor = {
        fiber: wip,
        prev: prevList,
        mount: current === null && attempt === 0,
        rerender: attempt > 0,
        first: null,
        last: null,
        index: 0,
        types: [],
        prevTypes: attempt === 0 ? prevTypes : [],
        warned: false,
      }
      wip.effects = []
      wip.dependencies = null
      wip.flags &= ~(Passive | LayoutEffect | UpdateFlag)
      emitRender(attempt)
      children = Component.render(props)
      const c = cursor
      wip.memoizedState = c.first
      hookTypesOf.set(wip, c.types)
      if (!rt.didScheduleRenderPhaseUpdate) {
        if (!c.mount && !c.rerender && c.prev !== null) {
          throw new ModelError('Rendered fewer hooks than expected. This may be caused by an accidental early return statement.', wip.id)
        }
        break
      }
      attempt++
      if (attempt >= RE_RENDER_LIMIT) {
        throw new ModelError('Too many re-renders. React limits the number of renders to prevent an infinite loop.', wip.id)
      }
    }
  } finally {
    cursor = prevCursor
    rt.renderingFiber = null
  }
  return children
}
