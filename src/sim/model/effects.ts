import type { ModelEvent } from './events'
import { ChildDeletion, Passive, PassiveMask, walkFibers, type Effect, type EffectTag, type Fiber } from './fiber'
import { rt } from './runtime'

/** React's areHookInputsEqual: same length, and every dep passes Object.is. */
export function areHookInputsEqual(next: readonly unknown[], prev: readonly unknown[]): boolean {
  if (next.length !== prev.length) return false
  return next.every((d, i) => Object.is(d, prev[i]))
}

type Emit = (e: ModelEvent) => void

function effectEvent(f: Fiber, e: Effect, action: 'cleanup' | 'run', timing: 'mutation' | 'layout' | 'passive', unmount?: boolean): ModelEvent {
  return { type: 'effect', fiberId: f.id, component: f.name, effectId: e.id, tag: e.tag, label: e.label, action, timing, ...(unmount ? { unmount } : {}) }
}

/** Run the cleanups of `tag` effects that must re-run this commit (deps changed). */
export function runEffectCleanups(f: Fiber, tag: EffectTag, timing: 'mutation' | 'passive', emit: Emit) {
  for (const e of f.effects) {
    if (e.tag !== tag || !e.hasEffect) continue
    const destroy = e.inst.destroy
    if (destroy) {
      e.inst.destroy = undefined
      emit(effectEvent(f, e, 'cleanup', timing))
      destroy()
    }
  }
}

/** Run the bodies of `tag` effects whose deps changed, keeping their cleanups. */
export function runEffectBodies(f: Fiber, tag: EffectTag, timing: 'layout' | 'passive', emit: Emit) {
  for (const e of f.effects) {
    if (e.tag !== tag || !e.hasEffect) continue
    emit(effectEvent(f, e, 'run', timing))
    const destroy = e.create()
    e.inst.destroy = typeof destroy === 'function' ? destroy : undefined
  }
}

/** Unmount one component: run every cleanup of `tag` it still holds. */
export function runFiberUnmountCleanups(f: Fiber, tag: EffectTag, timing: 'mutation' | 'passive', emit: Emit) {
  if (f.tag !== 'component') return
  for (const e of f.effects) {
    if (e.tag !== tag || !e.inst.destroy) continue
    const destroy = e.inst.destroy
    e.inst.destroy = undefined
    emit(effectEvent(f, e, 'cleanup', timing, true))
    destroy()
  }
}

/** Unmount a removed subtree: every cleanup of `tag`, parents first. */
export function runUnmountCleanups(deleted: Fiber, tag: EffectTag, timing: 'mutation' | 'passive', emit: Emit) {
  walkFibers(deleted, (f) => runFiberUnmountCleanups(f, tag, timing, emit))
}

/**
 * Passive effects for a committed tree (React's flushPassiveEffects): first every cleanup in
 * the tree (removed components, then changed effects, children before parents), then every
 * effect body. Updates made here go on DefaultLane.
 */
export function flushPassiveEffects(finished: Fiber, emit: Emit) {
  const prevContext = rt.context
  rt.context = 'passive'
  try {
    emit({ type: 'passive-start' })
    unmountPass(finished, emit)
    mountPass(finished, emit)
  } finally {
    rt.context = prevContext
  }
}

function unmountPass(f: Fiber, emit: Emit) {
  if (f.flags & ChildDeletion && f.deletions) {
    for (const d of f.deletions) runUnmountCleanups(d, 'passive', 'passive', emit)
  }
  if (f.subtreeFlags & PassiveMask) for (let c = f.child; c; c = c.sibling) unmountPass(c, emit)
  if (f.tag === 'component' && f.flags & Passive) runEffectCleanups(f, 'passive', 'passive', emit)
}

function mountPass(f: Fiber, emit: Emit) {
  if (f.subtreeFlags & Passive) for (let c = f.child; c; c = c.sibling) mountPass(c, emit)
  if (f.tag === 'component' && f.flags & Passive) runEffectBodies(f, 'passive', 'passive', emit)
}
