import type { Lane } from '../types'

/**
 * Lanes are bit flags, like React's: a lower bit is a higher priority, and a set of lanes is a
 * bitwise OR. Only the lanes this guide talks about exist here.
 */
export type Lanes = number

export const NoLanes: Lanes = 0
export const NoLane: Lanes = 0
export const SyncLane: Lanes = 0b0000_0010
export const InputContinuousLane: Lanes = 0b0000_1000
export const DefaultLane: Lanes = 0b0010_0000
export const TransitionLane: Lanes = 0b1000_0000
export const RetryLane: Lanes = 0b1_0000_0000_0000
export const IdleLane: Lanes = 0b1000_0000_0000_0000

const NAMES: [Lanes, Lane][] = [
  [SyncLane, 'SyncLane'],
  [InputContinuousLane, 'InputContinuousLane'],
  [DefaultLane, 'DefaultLane'],
  [TransitionLane, 'TransitionLane'],
  [RetryLane, 'RetryLane'],
  [IdleLane, 'IdleLane'],
]

/** `SyncLane` → `'SyncLane'` (the name the UI shows). */
export function laneName(lane: Lanes): Lane {
  const hit = NAMES.find(([l]) => l === getHighestPriorityLane(lane))
  return hit ? hit[1] : 'DefaultLane'
}

/** `'TransitionLane'` → `TransitionLane` */
export function laneFromName(name: Lane): Lanes {
  return NAMES.find(([, n]) => n === name)?.[0] ?? DefaultLane
}

export const mergeLanes = (a: Lanes, b: Lanes): Lanes => a | b
export const removeLanes = (set: Lanes, subset: Lanes): Lanes => set & ~subset
export const includesSomeLane = (a: Lanes, b: Lanes): boolean => (a & b) !== NoLanes
export const isSubsetOfLanes = (set: Lanes, subset: Lanes): boolean => (set & subset) === subset

/** The single highest-priority lane in a set (lowest set bit). */
export const getHighestPriorityLane = (lanes: Lanes): Lanes => lanes & -lanes

/** Lanes that must finish without yielding: everything above the transition lanes. */
export const includesBlockingLane = (lanes: Lanes): boolean =>
  includesSomeLane(lanes, SyncLane | InputContinuousLane | DefaultLane)

export const isTransitionLane = (lane: Lanes): boolean => includesSomeLane(lane, TransitionLane)

/** Names of every lane in a set, highest priority first. */
export function laneNames(lanes: Lanes): Lane[] {
  return NAMES.filter(([l]) => includesSomeLane(lanes, l)).map(([, n]) => n)
}
